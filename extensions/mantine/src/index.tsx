import { Action, ActionPanel, Icon, List, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import { DocumentsList } from "./components/DocumentsList";
import { SectionList } from "./components/SectionList";
import { DocumentationSection, getDocumentation } from "./helpers/getDocumentation";
import { uppercaseFirst } from "./utils/uppercaseFirst";

type Documentation = {
  sections: DocumentationSection[];
  changelog: DocumentationSection["data"];
};

export default function Command() {
  const [status, setStatus] = useState<"loading" | "error" | "initial" | "ready">("initial");
  const [documentation, setDocumentation] = useState<Documentation>();

  const getDocs = async () => {
    setStatus("loading");

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Loading documentation",
    });

    try {
      const docs = await getDocumentation();

      const dividedDocs = docs.reduce(
        (acc, doc) =>
          doc.section === "changelog"
            ? {
                ...acc,
                changelog: doc.data.reverse(),
              }
            : {
                ...acc,
                sections: [...acc.sections, doc],
              },
        {
          sections: [],
          changelog: [],
        } as Documentation
      );

      setDocumentation(dividedDocs);

      toast.style = Toast.Style.Success;
      toast.title = "Documentation loaded";
      setStatus("ready");
    } catch (error) {
      console.error(error);

      toast.style = Toast.Style.Failure;
      toast.title = "Failed to upload image";

      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore - TS complain about the typing
      toast.message = error.message;
      setStatus("error");
    }
  };

  useEffect(() => {
    getDocs();
  }, []);

  return (
    <>
      <List isLoading={documentation === undefined || status === "loading"}>
        {documentation && documentation?.sections?.length > 0 ? (
          <>
            {documentation.sections.map(({ section, data }) => (
              <List.Section key={section} title={uppercaseFirst(section)}>
                <DocumentsList documentation={data} />
              </List.Section>
            ))}
            <List.Section title="Changelog">
              <List.Item
                title="Changelog"
                icon={Icon.Dot}
                actions={
                  <ActionPanel>
                    <Action.Push
                      icon={Icon.List}
                      title="Open"
                      target={<SectionList data={documentation.changelog} title="Changelog" />}
                    />
                  </ActionPanel>
                }
              />
            </List.Section>
          </>
        ) : (
          <List.EmptyView title="Loading mantine" description="wait until documentation will load" icon="logo.png" />
        )}
      </List>
    </>
  );
}
