import {
  List,
  ActionPanel,
  Action,
  Icon,
  confirmAlert,
  Alert,
  showToast,
  Toast,
  closeMainWindow,
  Clipboard,
  Keyboard,
} from "@raycast/api";
import { useLocalStorage, runAppleScript } from "@raycast/utils";
import TemplateForm from "./TemplateForm";
import ImportForm from "./ImportForm";
import ExportForm from "./ExportForm";

export interface CannedReply {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  updatedAt: string;
}

export default function Command() {
  const {
    value: replies,
    setValue: setReplies,
    isLoading,
  } = useLocalStorage<CannedReply[]>("canned-replies", []);

  async function deleteTemplate(id: string) {
    const ok = await confirmAlert({
      title: "Delete Template",
      message: "Are you sure you want to delete this canned reply?",
      primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
      dismissAction: { title: "Cancel" },
    });
    if (!ok) return;
    const newList = (replies || []).filter((item) => item.id !== id);
    await setReplies(newList);
    await showToast({ style: Toast.Style.Success, title: "Template deleted" });
  }

  async function insertReply(bodyText: string, sendNow: boolean) {
    try {
      await closeMainWindow();
      // 1) Focus Mail and move cursor to top of the draft
      const moveToTopScript = `
        on run {}
          tell application "Mail" to activate
          tell application "System Events"
            key code 126 using {command down}
          end tell
        end run
      `;
      await runAppleScript(moveToTopScript, []);

      // 2) Paste without permanently altering the user's clipboard
      await Clipboard.paste(bodyText);

      // 3) Optionally send the email
      if (sendNow) {
        const sendScript = `
          on run {}
            tell application "System Events"
              keystroke "d" using {command down, shift down}
            end tell
          end run
        `;
        await runAppleScript(sendScript, []);
      }
      const successMessage = sendNow
        ? "Inserted and sent!"
        : "Inserted into draft";
      await showToast({ style: Toast.Style.Success, title: successMessage });
    } catch (error) {
      console.error("Insert failed:", error);
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to insert reply",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search canned replies...">
      {replies && replies.length > 0 ? (
        replies.map((reply) => (
          <List.Item
            key={reply.id}
            icon={Icon.Document}
            title={reply.title}
            subtitle={reply.body.slice(0, 50)}
            actions={
              <ActionPanel>
                <ActionPanel.Section title="Insert Reply">
                  <Action
                    title="Insert and Send"
                    icon={Icon.Envelope}
                    onAction={() => insertReply(reply.body, true)}
                  />
                  <Action
                    title="Insert Without Sending"
                    icon={Icon.Envelope}
                    shortcut={{ modifiers: ["shift"], key: "enter" }}
                    onAction={() => insertReply(reply.body, false)}
                  />
                </ActionPanel.Section>
                <ActionPanel.Section title="Manage Template">
                  <Action.Push
                    title="Edit Template"
                    icon={Icon.Pencil}
                    target={<TemplateForm existing={reply} />}
                    shortcut={Keyboard.Shortcut.Common.Edit}
                  />
                  <Action.Push
                    title="Duplicate Template"
                    icon={Icon.Document}
                    target={<TemplateForm existing={reply} duplicate={true} />}
                    shortcut={Keyboard.Shortcut.Common.Duplicate}
                  />
                  <Action
                    title="Delete Template"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    shortcut={Keyboard.Shortcut.Common.Remove}
                    onAction={() => deleteTemplate(reply.id)}
                  />
                </ActionPanel.Section>
                {/* Template-specific actions will be added in later phases */}
                <ActionPanel.Section title="General">
                  <Action.Push
                    title="Create New Template"
                    icon={Icon.Plus}
                    target={<TemplateForm />}
                    shortcut={Keyboard.Shortcut.Common.New}
                  />
                  <Action.Push
                    title="Import from JSON"
                    icon={Icon.Download}
                    target={<ImportForm />}
                  />
                  <Action.Push
                    title="Export to JSON"
                    icon={Icon.Upload}
                    target={<ExportForm />}
                  />
                  <Action.OpenInBrowser
                    title="Open Documentation"
                    icon={Icon.Globe}
                    shortcut={Keyboard.Shortcut.Common.Open}
                    url="https://github.com/Enragedsaturday/raycast-canned-email-response#readme"
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        ))
      ) : (
        <List.EmptyView
          icon={Icon.Document}
          title="No Canned Replies"
          description="No templates found. Create a new reply template to get started."
          actions={
            <ActionPanel>
              <Action.Push
                title="Create New Template"
                icon={Icon.Plus}
                target={<TemplateForm />}
                shortcut={Keyboard.Shortcut.Common.New}
              />
              <Action.Push
                title="Import from JSON"
                icon={Icon.Download}
                target={<ImportForm />}
              />
              <Action.OpenInBrowser
                title="Open Documentation"
                icon={Icon.Globe}
                shortcut={Keyboard.Shortcut.Common.Open}
                url="https://github.com/Enragedsaturday/raycast-canned-email-response#readme"
              />
            </ActionPanel>
          }
        />
      )}
    </List>
  );
}
