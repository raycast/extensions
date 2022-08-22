import { useEffect, useState } from "react";
import { Action, ActionPanel, Detail, environment, Form, Icon, popToRoot, showToast, Toast } from "@raycast/api";
import { runAppleScriptSync } from "run-applescript";
import { writeFileSync } from "fs";
import { join } from "path";

import { v4 as uuidv4 } from "uuid";
import { detectType, FMObjectsToXML } from "./utils/FmClipTools";
import CreateError from "./components/create-snippet-error";
import { SnippetType, snippetTypesMap } from "./utils/types";

type MyFormValues = {
  name: string;
  type: SnippetType;
};
// const script = FMObjectsToXML();
export default function Command() {
  const [createState, setCreateState] = useState<"init" | "clipboardError" | "clipboardSuccess" | "form">("init");
  const [snippet, setSnippet] = useState("");
  const [nameError, setNameError] = useState<string>();
  const getSnippetFromClipboard = async () => {
    setCreateState("init");

    try {
      const res = await FMObjectsToXML();
      //   console.log({ res });
      setCreateState("clipboardSuccess");
      setSnippet(res ?? "");
    } catch (e) {
      setCreateState("clipboardError");
      console.error("Could not create snippet");
    }
  };
  function dropNameErrorIfNeeded() {
    if (nameError && nameError.length > 0) {
      setNameError(undefined);
    }
  }
  async function saveSnippet(values: MyFormValues) {
    await showToast({ title: "Saving snippet...", style: Toast.Style.Animated });
    const mySnippet = {
      id: uuidv4(),
      name: values.name,
      type: values.type,
      snippet,
    };
    writeFileSync(join(environment.supportPath, `${mySnippet.id}.json`), JSON.stringify(mySnippet));
    await showToast({ title: "Snippet saved", style: Toast.Style.Success });
    popToRoot();
  }
  useEffect(() => {
    getSnippetFromClipboard();
    console.log(environment.supportPath);
  }, []);

  if (createState === "clipboardError") return <CreateError actionProps={{ onAction: getSnippetFromClipboard }} />;
  if (createState === "form")
    return (
      <Form
        actions={
          <ActionPanel>
            <Action.SubmitForm<MyFormValues> title="Save Snippet" onSubmit={saveSnippet} />
          </ActionPanel>
        }
      >
        <Form.TextField
          id="name"
          title="Name"
          error={nameError}
          onChange={dropNameErrorIfNeeded}
          onBlur={(event) => {
            if (event.target.value?.length == 0) {
              setNameError("This field is required!");
            } else {
              dropNameErrorIfNeeded();
            }
          }}
        />
        <Form.Dropdown id="type" title="Type" defaultValue={detectType(snippet)}>
          {(Object.keys(snippetTypesMap) as SnippetType[]).map((type) => (
            <Form.Dropdown.Item title={snippetTypesMap[type]} value={type} />
          ))}
        </Form.Dropdown>
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
