import { Action, ActionPanel, Icon, List, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import { SectionList } from "./components/SectionList";
import { DocumentationSection, getDocumentation } from "./helpers/getDocumentation";
import { uppercaseFirst } from "./utils/uppercaseFirst";

export default function Command() {
  const [status, setStatus] = useState<"loading" | "error" | "initial" | "ready">("initial");
  const [documentation, setDocumentation] = useState<DocumentationSection[]>();

  const getDocs = async () => {
    setStatus("loading");

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Loading documentation",
    });

    try {
      const docs = await getDocumentation();

      setDocumentation(docs);

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
        {documentation && documentation?.length > 0 ? (
          <>
            {documentation.map(({ section, data }) => (
              <List.Item
                icon={Icon.Dot}
                title={uppercaseFirst(section)}
                key={section}
                actions={
                  <ActionPanel>
                    <Action.Push
                      icon={Icon.List}
                      title="Open"
                      target={<SectionList data={data} title={uppercaseFirst(section)} />}
                    />
                  </ActionPanel>
                }
              />
            ))}
          </>
        ) : (
          <List.EmptyView title="Loading mantine" description="wait until documentation will load" icon="logo.png" />
        )}
      </List>
    </>
  );
}
