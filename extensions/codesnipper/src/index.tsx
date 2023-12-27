// Import necessary modules and functions from external libraries and Raycast API
import {
  Action,
  ActionPanel,
  Alert,
  Clipboard,
  closeMainWindow,
  confirmAlert,
  Detail,
  getPreferenceValues,
  Icon,
  List,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useSqlNotes } from "./useSql"; // Import custom hook for handling SQL notes
import { testPermissionErrorType, PermissionErrorScreen } from "./errors"; // Import custom error handling utilities
import { SnippetItem } from "./types"; // Import type definition for SnippetItem
import { useState } from "react"; // Import useState hook from React
import { open } from "@raycast/api"; // Import open function from Raycast API
import { stringify as uuidStringify } from "uuid"; // Import uuidStringify function from uuid library

// Define interface for preferences
interface Preferences {
  folders: boolean;
}

// Get user's preferences
const preferences: Preferences = getPreferenceValues();

// Define the default command function
export default function Command() {
  // Use custom hook to retrieve SQL notes and error state
  const sqlState = useSqlNotes();
  const [failedToOpenMessage, setFailedToOpenMessage] = useState(""); // Define state for storing failed open message
  const { push } = useNavigation();

  // Function to open a note using its UUID
  async function openNote(note: SnippetItem) {
    const id = uuidStringify(note.UUID).toUpperCase(); // Convert UUID to string and format it
    const link = "codesnipper://snippets/" + id; // Create a custom link for the note
    await open(link); // Open the note using Raycast's open function
  }

  // Function to copy code to clipboard
  async function copyCode(note: SnippetItem) {
    const code = note.code; // Get the code from the note
    Clipboard.copy(code ?? ""); // Copy the code to clipboard
    showToast({
      style: Toast.Style.Success,
      title: "Copied code",
      message: "Code added to clipboard",
    }); // Show a failure toast with error message
  }

  // Handle errors related to SQL query
  if (sqlState.error) {
    if (testPermissionErrorType(sqlState.error) === "fullDiskAccess") {
      return <PermissionErrorScreen errorType={"fullDiskAccess"} />; // Display PermissionErrorScreen for full disk access error
    } else {
      showToast({
        style: Toast.Style.Failure,
        title: "Cannot search snippets",
        message: sqlState.error.message,
      }); // Show a failure toast with error message
    }
  }

  const notes = (sqlState.results || []) // Filter and sort the notes
    .sort((a, b) => (a.modifiedAt && b.modifiedAt && a.modifiedAt < b.modifiedAt ? 1 : -1)); // Sort notes by modified date

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
        <List isLoading={sqlState.isLoading} searchBarPlaceholder="Search snippets...">
          {notes.map((note) => (
            <List.Item
              key={note.id}
              icon="command-icon.png"
              title={note.title || ""}
              subtitle={(note.snippet ?? "").substring(0, 60) + "..."}
              keywords={[`${note.folder}`].concat(note.snippet ? [note.snippet] : [])}
              accessories={([] as List.Item.Accessory[]).concat(
                preferences.folders
                  ? [
                      {
                        text: note.folder ?? "No Folder",
                        icon: Icon.Folder,
                        tooltip: "Folder",
                      },
                    ]
                  : []
              )}
              actions={
                <ActionPanel title="Actions">
                  <Action title="Copy Snippet" icon={Icon.CopyClipboard} onAction={() => copyCode(note)} />
                  <Action
                    title="Open in CodeSnipper"
                    icon={Icon.AppWindow}
                    onAction={() => openNote(note)}
                    shortcut={{ modifiers: ["cmd"], key: "o" }}
                  />
                  <ActionPanel.Section title="Details">
                    {note.snippet && (
                      <Action
                        title="Show Explanation"
                        icon={Icon.Info}
                        onAction={() => push(<Information snippet={note} />)}
                        shortcut={{ modifiers: ["cmd"], key: "i" }}
                      />
                    )}
                    {note.code && (
                      <Action
                        title="Show Code"
                        icon={Icon.Code}
                        onAction={() => push(<CodeDetail snippet={note} />)}
                        shortcut={{ modifiers: ["cmd"], key: "d" }}
                      />
                    )}
                  </ActionPanel.Section>
                  <ActionPanel.Section title="Copy Actions">
                    <Action.CopyToClipboard
                      title="Copy Snippet URL"
                      icon={Icon.Link}
                      content={{
                        html: `<a href="codesnipper://snippets=${uuidStringify(note.UUID).toUpperCase()}" title="${
                          note.title
                        }">${note.title}</a>`,
                        text: `codesnipper://snippets=${uuidStringify(note.UUID).toUpperCase()}`,
                      }}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                    />
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
          ))}
        </List>
      )}
    </>
  );
}

// Define a component named Information that takes a prop named snippet of type SnippetItem
const Information = ({ snippet }: { snippet: SnippetItem }) => {
  const { pop } = useNavigation(); // Destructure the pop function from the useNavigation hook

  // Define an async function named copyCode that takes a parameter note of type SnippetItem
  async function copyCode(note: SnippetItem) {
    const code = note.snippet; // Get the code from the note
    Clipboard.copy(code ?? ""); // Copy the code to clipboard
    showToast({
      style: Toast.Style.Success,
      title: "Copied explanation",
      message: "Explanation added to clipboard",
    }); // Show a failure toast with error message
  }

  // Render a Detail component with a markdown prop set to the snippet's snippet property
  // and an actions prop containing two Action components: Go back and Copy Explanation
  return (
    <Detail
      markdown={snippet.snippet}
      actions={
        <ActionPanel>
          <Action title="Go back" onAction={pop} />
          <Action
            title="Copy Explanation"
            icon={Icon.CopyClipboard}
            onAction={() => copyCode(snippet)}
            shortcut={{ modifiers: ["cmd"], key: "c" }}
          />
        </ActionPanel>
      }
    />
  );
};

// Define a component named CodeDetail that takes a prop named snippet of type SnippetItem
const CodeDetail = ({ snippet }: { snippet: SnippetItem }) => {
  const { pop } = useNavigation(); // Destructure the pop function from the useNavigation hook

  // Define an async function named openNote that takes a parameter note of type SnippetItem
  async function openNote(note: SnippetItem) {
    const id = uuidStringify(note.UUID).toUpperCase(); // Convert UUID to string and format it
    const link = "codesnipper://snippets/" + id; // Create a custom link for the note
    await open(link); // Open the note using Raycast's open function
  }

  // Define an async function named copyCode that takes a parameter note of type SnippetItem
  async function copyCode(note: SnippetItem) {
    const code = note.code; // Get the code from the note
    Clipboard.copy(code ?? ""); // Copy the code to clipboard
    showToast({
      style: Toast.Style.Success,
      title: "Copied code",
      message: "Code added to clipboard",
    }); // Show a failure toast with error message
  }

  // Render a Detail component with a markdown prop set to a code block containing the snippet's code
  // and an actions prop containing three Action components: Go back, Copy Snippet, and Open in CodeSnipper
  return (
    <Detail
      markdown={"```" + snippet.language + "\n" + snippet.code + "\n ```"}
      actions={
        <ActionPanel>
          <Action title="Go back" onAction={pop} />
          <Action
            title="Copy Snippet"
            icon={Icon.CopyClipboard}
            onAction={() => copyCode(snippet)}
            shortcut={{ modifiers: ["cmd"], key: "c" }}
          />
          <Action
            title="Open in CodeSnipper"
            icon={Icon.AppWindow}
            onAction={() => openNote(snippet)}
            shortcut={{ modifiers: ["cmd"], key: "o" }}
          />
        </ActionPanel>
      }
    />
  );
};
