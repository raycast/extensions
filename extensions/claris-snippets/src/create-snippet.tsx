import { useEffect, useState } from "react";
import { Action, ActionPanel, Clipboard, Detail, Form, Icon } from "@raycast/api";
import { runAppleScriptSync } from "run-applescript";
import { detectType, FMObjectsToXML, snippetTypesMap } from "./utils/FmClipTools";
import CreateError from "./components/create-snippet-error";

// const script = FMObjectsToXML();
export default function Command() {
  const [createState, setCreateState] = useState<"init" | "clipboardError" | "clipboardSuccess" | "form">("init");
  const [snippet, setSnippet] = useState("");
  const createSnippet = async () => {
    setCreateState("init");

    try {
      const res = await FMObjectsToXML();
      console.log({ res });
      setCreateState("clipboardSuccess");
      setSnippet(res ?? "");
    } catch (e) {
      setCreateState("clipboardError");
      console.error("Could not create snippet");
    }
  };
  useEffect(() => {
    createSnippet();
  }, []);

  if (createState === "clipboardError") return <CreateError actionProps={{ onAction: createSnippet }} />;
  if (createState === "form")
    return (
      <Form>
        <Form.TextField id="name" title="Name" />
      </Form>
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
            onAction={createSnippet}
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
