// Import custom hooks, types, and functions
import { useSqlFolders } from "./useSqlFolder";
import { FolderItem } from "./types";
import { stringify as uuidStringify } from "uuid";
import { useState } from "react";
import { testPermissionErrorType, PermissionErrorScreen } from "./errors";

// Import Raycast API components and functions
import { Action, ActionPanel, Form, showToast, Toast, Detail, Icon, open } from "@raycast/api";

// Define the default command function
export default function Command() {
  // Use custom hook to retrieve SQL folders and error state
  const sqlState = useSqlFolders();
  
  // Define state variables
  const [failedToOpenMessage, setFailedToOpenMessage] = useState("");
  const [folder, setFolder] = useState<string>("");
  const [name, setName] = useState<string>("");
  const [code, setCode] = useState<string>("");
  const [contentError, setContentError] = useState<string | undefined>();

  // Handle errors related to SQL query
  if (sqlState.error) {
    if (testPermissionErrorType(sqlState.error) === "fullDiskAccess") {
      return <PermissionErrorScreen errorType={"fullDiskAccess"} />;
    } else {
      showToast({
        style: Toast.Style.Failure,
        title: "Cannot search notes",
        message: sqlState.error.message,
      });
    }
  }

  // Function to clear content error if it exists
  function dropContentErrorIfNeeded() {
    if (contentError && contentError.length > 0) {
      setContentError(undefined);
    }
  }

  // Filter and remove duplicate folders
  const alreadyFound: { [key: string]: boolean } = {};
  const folders = (sqlState.results || []).filter((x) => {
    const found = alreadyFound[x.id];
    if (!found) {
      alreadyFound[x.id] = true;
    }
    return !found;
  });

  // Function to submit code
  async function submitCode(){
    if (code.length != 0) {
      dropContentErrorIfNeeded();
      let link = `codesnipper://create?title=${encodeURIComponent(name)}&folder=${encodeURIComponent(folder)}&code=${encodeURIComponent(code)}`
      console.log(link)
      await open(link);
    } else {
      setContentError("Code is required");
    }
  }

  return (
    <>
      {failedToOpenMessage && (
        <>
          <Detail
            navigationTitle="Failure"
            markdown={`### Failed to open the snippet with error:\n ${failedToOpenMessage}`}
            actions={
              <ActionPanel title="Failure Actions">
                <Action.OpenInBrowser
                  title={"Submit Bug Report"}
                  url="https://github.com/raycast/extensions/issues/new?template=extension_bug_report.yml&title=CodeSnipper+...&extension-url=https%3A%2F%2Fraycast.com%2Ftumtum%2Fcodesnipper"
                />
                <Action.CopyToClipboard
                  title="Copy Error Message"
                  content={{
                    text: failedToOpenMessage,
                  }}
                />
              </ActionPanel>
            }
          />
        </>
      )}

      {!failedToOpenMessage && (
        <Form
          actions={
            <ActionPanel>
              <Action.SubmitForm title="Create snippet" onSubmit={(_) => submitCode()} />
            </ActionPanel>
          }
        >
          <Form.TextArea
            id="code"
            title="Code"
            placeholder="Code..."
            value={code}
            onChange={setCode}
            error={contentError}
            onBlur={(event) => {
              if (event.target.value?.length === 0) {
                setContentError("Code is required");
              } else {
                dropContentErrorIfNeeded();
              }
            }}
          />

          <Form.TextField
            id="name"
            title="Snippet Name"
            placeholder="New snippet name..."
            value={name}
            onChange={setName}
          />
          <Form.Dropdown isLoading={sqlState.isLoading} id="folder" title="Folder" value={folder} onChange={setFolder}>
            <Form.Dropdown.Item value={"no-value"} key={"no-key"} title="No folder" icon={Icon.XMarkCircle} />;
            {folders.map((folder) => {
              return (
                <Form.Dropdown.Item
                  value={uuidStringify(folder.UUID).toUpperCase()}
                  title={folder.title}
                  icon={Icon.Folder}
                  key={folder.id}
                />
              );
            })}
          </Form.Dropdown>
        </Form>
      )}
    </>
  );
}
