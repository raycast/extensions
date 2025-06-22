import { Action, Icon, Toast, confirmAlert, getPreferenceValues, showInFinder, showToast } from "@raycast/api";
import { Chat, ChatManager } from "../../../lib/chats/types";
import { ExtensionPreferences } from "../../../lib/preferences/types";
import path from "path";
import * as fs from "fs";
import { defaultAdvancedSettings } from "../../../data/default-advanced-settings";
import { getActionShortcut } from "../../../lib/actions";

/**
 * Action to export a chat to a JSON file.
 * @param props.chat The chat to export.
 * @param props.chats The chat manager object.
 * @returns An action component.
 */
export const ExportChatAction = (props: {
  chat: Chat;
  chats: ChatManager;
  settings: typeof defaultAdvancedSettings;
}) => {
  const { chat, chats, settings } = props;
  const preferences = getPreferenceValues<ExtensionPreferences>();

  return (
    <Action
      title="Export Chat"
      icon={Icon.Download}
      shortcut={getActionShortcut("ExportChatAction", settings)}
      onAction={async () => {
        const toast = await showToast({ title: "Exporting Chat", style: Toast.Style.Animated });

        const includeContext =
          chat.contextData?.length &&
          (await confirmAlert({
            title: "Include Context Data & Stats?",
            message: "Do you want context data and statistics included in the export?",
            primaryAction: { title: "Yes" },
            dismissAction: { title: "No" },
          }));

        const chatContents = chats.getChatContents(chat);

        const failedExports: string[] = [];
        if (includeContext && chat.contextData?.length > 0) {
          let dirPath = path.resolve(preferences.exportLocation, chat.name);
          let i = 2;
          while (fs.existsSync(dirPath)) {
            dirPath = path.resolve(preferences.exportLocation, chat.name + "-" + i);
            i += 1;
          }
          const contextPath = path.resolve(dirPath, "context");
          fs.mkdirSync(contextPath, { recursive: true });

          chat.contextData.forEach((data, index) => {
            const jsonString = JSON.stringify(data);
            try {
              fs.writeFileSync(path.resolve(contextPath, encodeURIComponent(data.source + ".json")), jsonString);
            } catch (error) {
              console.error(error);
              failedExports.push(`Context Data ${index}`);
            }
          });

          fs.writeFile(path.resolve(dirPath, "chat.txt"), chatContents, (err) => {
            if (err) {
              failedExports.push("Main Chat");
            }
          });

          const statsJSON = JSON.stringify(chats.calculateStats(chat.name));
          try {
            fs.writeFileSync(path.resolve(dirPath, chat.name + "-stats.json"), statsJSON);
          } catch {
            failedExports.push("Stats");
          }

          if (failedExports.length == chat.contextData?.length + 2) {
            toast.style = Toast.Style.Failure;
            toast.title = "Failed Export";
            toast.message = "Couldn't export chat or context data";
          } else if (!failedExports.includes("Main Chat") && failedExports.length > 0) {
            toast.style = Toast.Style.Failure;
            toast.title = "Export Partially Successful";
            toast.message = dirPath;
            toast.primaryAction = {
              title: "Show In Finder",
              onAction: async () => {
                await showInFinder(dirPath);
              },
            };
          } else if (failedExports.length == 0) {
            toast.style = Toast.Style.Success;
            toast.title = "Chat Exported Successfully";
            toast.message = dirPath;
            toast.primaryAction = {
              title: "Show In Finder",
              onAction: async () => {
                await showInFinder(dirPath);
              },
            };
          }
        } else {
          let filePath = path.resolve(preferences.exportLocation, chat.name);

          let i = 2;
          while (fs.existsSync(filePath + ".txt")) {
            filePath = path.resolve(preferences.exportLocation, chat.name + "-" + i);
            i += 1;
          }

          fs.writeFile(filePath + ".txt", chatContents, (err) => {
            if (err) {
              toast.style = Toast.Style.Failure;
              toast.title = "Error";
              toast.message = "Couldn't export chat";
              throw err;
            } else {
              const statsJSON = JSON.stringify(chats.calculateStats(chat.name));
              fs.writeFile(path.resolve(preferences.exportLocation, chat.name + "-stats.json"), statsJSON, (err) => {
                if (err) {
                  toast.style = Toast.Style.Failure;
                  toast.title = "Error";
                  toast.message = "Couldn't export statistics";
                } else {
                  failedExports.push("Stats");

                  toast.style = Toast.Style.Success;
                  toast.title = "Chat Exported Successfully";
                  toast.message = filePath + ".txt";
                  toast.primaryAction = {
                    title: "Show In Finder",
                    onAction: async () => {
                      await showInFinder(filePath + ".txt");
                    },
                  };
                }
              });
            }
          });
        }
      }}
    />
  );
};
