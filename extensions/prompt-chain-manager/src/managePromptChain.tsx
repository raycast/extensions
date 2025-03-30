import React from "react";
import {
  ActionPanel,
  Action,
  List,
  Icon,
  Color,
  showToast,
  Toast,
  confirmAlert,
  Alert,
  getPreferenceValues,
  Clipboard,
  launchCommand,
  LaunchType,
  useNavigation,
  Detail,
} from "@raycast/api";
import { useChainState } from "./hooks/useChainState"; // Adjust path if needed

// Define preferences structure matching package.json
interface Preferences {
  includeHeadersInCopy: boolean;
  templateDirectory?: string;
}

/**
 * Main command component: Manage Prompt Chain.
 * Displays the list of prompt chunks, enables management actions,
 * and shows a detail preview of the selected chunk's content.
 */
export default function ManagePromptChain() {
  // State and actions from the custom hook
  const { chain, isLoading, removeChunk, toggleChunk, moveChunk, clearChain, getFormattedEnabledChunks } =
    useChainState();

  // Hooks for navigation and preferences
  const navigation = useNavigation();
  const preferences = getPreferenceValues<Preferences>();

  // --- Action Handler Functions ---

  /** Copies the combined text of enabled chunks to the clipboard. */
  async function handleCopy() {
    const textToCopy = getFormattedEnabledChunks(preferences.includeHeadersInCopy);
    if (!textToCopy) {
      showToast(Toast.Style.Failure, "Nothing to Copy", "No enabled chunks found.");
      return;
    }
    await Clipboard.copy(textToCopy);
    await showToast(Toast.Style.Success, "Copied to Clipboard", `${textToCopy.length} characters copied.`);
  }

  /** Copies the enabled chunks and then clears the chain. */
  async function handleFinalize() {
    await handleCopy();
    // Add a small delay so the copy toast is visible before the clear toast
    setTimeout(async () => {
      await clearChain();
    }, 150);
  }

  /** Confirms with the user before clearing all chunks. */
  async function confirmAndClear() {
    if (
      await confirmAlert({
        title: "Clear Prompt Chain?",
        message: "This will remove all chunks. This action cannot be undone.",
        primaryAction: { title: "Clear Chain", style: Alert.ActionStyle.Destructive },
      })
    ) {
      await clearChain();
    }
  }

  /** Launches the separate command to add clipboard content. */
  async function launchAddClipboardCommand() {
    try {
      // Ensure command name matches package.json
      await launchCommand({ name: "addClipboardToChain", type: LaunchType.UserInitiated });
    } catch (error) {
      console.error("Failed to launch addClipboardToChain command:", error);
      await showToast(Toast.Style.Failure, "Could not launch Add Clipboard command");
    }
  }

  /** Launches the separate command to add template content. */
  async function launchAddTemplateCommand() {
    try {
      // Ensure command name matches package.json
      await launchCommand({ name: "addTemplateToChain", type: LaunchType.UserInitiated });
    } catch (error) {
      console.error("Failed to launch addTemplateToChain command:", error);
      await showToast(Toast.Style.Failure, "Could not launch Add Template command");
    }
  }

  /** Shows a detailed preview of the final combined prompt string. */
  function handlePreviewFinalPrompt() {
    const promptText = getFormattedEnabledChunks(preferences.includeHeadersInCopy);
    if (!promptText) {
      showToast(Toast.Style.Failure, "Nothing to Preview", "No enabled chunks found.");
      return;
    }
    // Push a Detail view showing the formatted prompt
    navigation.push(
      <Detail
        markdown={`\`\`\`\n${promptText}\n\`\`\``} // Use code block for formatting
        navigationTitle="Final Prompt Preview"
        actions={
          <ActionPanel>
            <Action.CopyToClipboard title="Copy Preview Content" content={promptText} />
          </ActionPanel>
        }
      />,
    );
  }

  // --- Render UI ---
  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search prompt chunks..."
      isShowingDetail={true} // Enable the detail pane for preview on selection
    >
      {/* Empty View */}
      {chain.length === 0 && !isLoading ? (
        <List.EmptyView
          title="Prompt Chain is Empty"
          description="Add content from Clipboard or Templates to begin."
          actions={
            <ActionPanel>
              <Action title="Add from Clipboard" icon={Icon.Clipboard} onAction={launchAddClipboardCommand} />
              <Action title="Add from Template" icon={Icon.List} onAction={launchAddTemplateCommand} />
            </ActionPanel>
          }
        />
      ) : (
        // List Section with Chunks
        <List.Section
          title="Prompt Chunks"
          subtitle={`${chain.filter((c) => c.enabled).length} / ${chain.length} enabled`}
        >
          {chain.map((chunk, index) => (
            <List.Item
              key={chunk.id}
              title={chunk.header || `Chunk #${index + 1}`}
              icon={
                // Icon indicates enabled status
                chunk.enabled
                  ? { source: Icon.CheckCircle, tintColor: Color.Green }
                  : { source: Icon.Circle, tintColor: Color.SecondaryText }
              }
              // --- MODIFIED: Removed the accessory tag ---
              accessories={[]} // Set accessories to an empty array
              // --- End of Modification ---
              // Detail view content for the selected item
              detail={
                <List.Item.Detail
                  // Show header and content formatted as Markdown
                  markdown={`**Header:**\n\`\`\`${chunk.header || "(No Header)"}\`\`\`\n\n\n**Content:**\n\`\`\`\n${chunk.content}\n\`\`\``}
                  // Metadata section remains omitted to avoid previous rendering errors
                />
              }
              // Actions available for each item
              actions={
                <ActionPanel>
                  <ActionPanel.Section title="Chunk Management">
                    {/* Toggle action */}
                    <Action
                      title={chunk.enabled ? "Disable Chunk" : "Enable Chunk"}
                      icon={chunk.enabled ? Icon.Circle : Icon.CheckCircle}
                      onAction={() => toggleChunk(chunk.id)}
                    />
                    {/* Remove action */}
                    <Action
                      title="Remove Chunk"
                      icon={Icon.Trash}
                      style={Action.Style.Destructive}
                      shortcut={{ modifiers: ["cmd"], key: "d" }}
                      onAction={() => removeChunk(chunk.id)}
                    />
                    {/* Reorder actions */}
                    <Action
                      title="Move up"
                      icon={Icon.ArrowUp}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "arrowUp" }}
                      onAction={() => moveChunk(chunk.id, "up")}
                      disabled={index === 0}
                    />
                    <Action
                      title="Move Down"
                      icon={Icon.ArrowDown}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "arrowDown" }}
                      onAction={() => moveChunk(chunk.id, "down")}
                      disabled={index === chain.length - 1}
                    />
                  </ActionPanel.Section>
                  <ActionPanel.Section title="Output & Actions">
                    {/* Preview action uses Cmd+Shift+P */}
                    <Action
                      title="Preview Final Prompt"
                      icon={Icon.Eye}
                      onAction={handlePreviewFinalPrompt}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
                    />
                    {/* Copy All action */}
                    <Action
                      title="Copy All Enabled Chunks"
                      icon={Icon.CopyClipboard}
                      onAction={handleCopy}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                    />
                    {/* Copy This Chunk action */}
                    <Action.CopyToClipboard title="Copy This Chunk's Content" content={chunk.content} />
                  </ActionPanel.Section>
                  <ActionPanel.Section title="Chain Actions">
                    {/* Add actions */}
                    <Action title="Add from Clipboard" icon={Icon.Clipboard} onAction={launchAddClipboardCommand} />
                    <Action title="Add from Template" icon={Icon.List} onAction={launchAddTemplateCommand} />
                    {/* Finalize action */}
                    <Action
                      title="Finalize & Clear Chain"
                      icon={Icon.Checkmark}
                      onAction={handleFinalize}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "enter" }}
                    />
                    {/* Clear action */}
                    <Action
                      title="Clear Entire Chain"
                      icon={Icon.Trash}
                      style={Action.Style.Destructive}
                      onAction={confirmAndClear}
                      shortcut={{ modifiers: ["opt", "shift"], key: "delete" }}
                    />
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}
