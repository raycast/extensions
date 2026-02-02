import { ActionPanel, List, Action, showToast, Toast, getPreferenceValues } from "@raycast/api";
import { MESSAGES } from "./messages";
import { sendSlackMessage, getLanguage, Preferences } from "./utils";

type WkKey = "clockin" | "clockout" | "leave" | "back" | "lunch";
const KEYS: WkKey[] = ["clockin", "clockout", "leave", "back", "lunch"];

/**
 * Main command for sending quick status updates to Slack (Clock In/Out, Leave, etc.).
 * Supports both personal and business channels depending on the action type.
 */
export default function Command() {
  const lang = getLanguage() as keyof typeof MESSAGES.wk;
  const wkMessages = MESSAGES.wk[lang];
  const preferences = getPreferenceValues<Preferences>();

  const handleAction = async (key: WkKey) => {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Sending...",
    });

    try {
      const personalMsg = MESSAGES.clockin.personal[lang][key];
      const personalChannel = preferences.slackPersonalChannel;

      let success = await sendSlackMessage(personalChannel, personalMsg);

      const sendToBusiness = ["clockin", "clockout"].includes(key);
      const businessChannel = preferences.slackBusinessChannel;

      if (sendToBusiness && businessChannel) {
        const businessMsg = MESSAGES.clockin.business[key as "clockin" | "clockout"];
        if (businessMsg) {
          const businessSuccess = await sendSlackMessage(businessChannel, businessMsg);
          success = success && businessSuccess;
        }
      }

      const statusMsgs = MESSAGES.clockin.status[lang];

      if (success) {
        toast.style = Toast.Style.Success;
        toast.title = statusMsgs.success;
      } else {
        toast.style = Toast.Style.Failure;
        toast.title = statusMsgs.failed;
      }
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Error occurred";
      toast.message = String(error);
    }
  };

  return (
    <List>
      {KEYS.map((key) => {
        const item = wkMessages[key];
        return (
          <List.Item
            key={key}
            icon="../assets/clockin.png"
            title={item.title}
            subtitle={item.subtitle}
            actions={
              <ActionPanel>
                <Action title={item.title} onAction={() => handleAction(key)} />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
