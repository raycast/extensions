import { useEffect, useState } from "react";
import { Action, ActionPanel, Detail, Icon, useNavigation } from "@raycast/api";
import { detectType, FMObjectsToXML } from "./utils/FmClipTools";
import CreateError from "./components/create-snippet-error";
import { snippetTypesMap } from "./utils/types";
import EditSnippet from "./components/edit-snippet";
import { getFromClipboard } from "./utils/snippets";

type PropsType = {
  onPop?: () => void;
};
export default function Command(props: PropsType) {
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  const { onPop = () => {} } = props;
  const [createState, setCreateState] = useState<"init" | "clipboardError" | "clipboardSuccess" | "form">("init");
  const [snippet, setSnippet] = useState("");
  const { pop } = useNavigation();

  const getSnippetFromClipboard = async () => {
    const data = await getFromClipboard();
    if (data) {
      setSnippet(data);
      setCreateState("form");
    } else {
      setCreateState("clipboardError");
    }
  };

  useEffect(() => {
    getSnippetFromClipboard();
  }, []);

  if (createState === "clipboardError")
    return (
      <CreateError actionProps={{ onAction: getSnippetFromClipboard, shortcut: { key: "r", modifiers: ["cmd"] } }} />
    );
  if (createState === "form")
    return (
      <EditSnippet
        snippet={{ snippet, type: detectType(snippet) }}
        onSubmit={() => {
          onPop();
          pop();
        }}
      />
    );

  return (
    <Detail
      isLoading={createState === "init"}
      actions={
        <ActionPanel>
          <Action
            title="Save Snippet"
            icon={Icon.NewDocument}
            onAction={() => {
              setCreateState("form");
            }}
          />
          <Action
            title="Reload"
            icon={Icon.RotateClockwise}
            shortcut={{ key: "r", modifiers: ["cmd"] }}
            onAction={getSnippetFromClipboard}
          />
          <Action.CopyToClipboard content={snippet} icon={Icon.Clipboard} shortcut={{ key: "c", modifiers: ["cmd"] }} />
        </ActionPanel>
      }
      markdown={snippet}
      metadata={
        createState === "clipboardSuccess" ? (
          <Detail.Metadata>
            <Detail.Metadata.Label title="Snippet Type" text={snippetTypesMap[detectType(snippet)]} />
            <Detail.Metadata.Label title="Does this Look right?" text={`Continue to save this snippet`} />
            <Detail.Metadata.Label title="Something off?" text={`⌘+R to reload from clipboard`} />
          </Detail.Metadata>
        ) : undefined
      }
    />
  );
}
