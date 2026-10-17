import {
  Action,
  ActionPanel,
  Detail,
  getPreferenceValues,
  Icon,
  openExtensionPreferences,
  showToast,
  Toast,
} from "@raycast/api";
import { handleError } from "../lib/error-handler";
import { ERROR_MESSAGES } from "../lib/constants";
import CommonActions from "./CommonActions";
import { KeeperExtensionPreferences } from "../lib/types";

const preferences = getPreferenceValues<KeeperExtensionPreferences>();
const BASE_API_URL = preferences.apiUrl;

interface ErrorProps {
  error: unknown;
}

const COMMON_TROUBLESHOOTING_STEPS = `
> ### General Steps
>
> - **Check your Keeper Commander service mode** is running  
> - **Verify your Keeper Service Mode API URL** (eg: must be like http://localhost:9092 or your NGROK URL) and valid generated **API key** from extension preferences settings  
> - Ensure **keeper service** is running with **correct keeper command and options**
> - **Ensure you have internet connection**  
> - **Try restarting** the service if needed
`;

const HELP_SECTION = `
---

### Need More Help?

If you continue to experience problems, please reach out by opening an issue in our [GitHub repository](https://github.com/raycast/extensions/issues/new/choose).

We're here to help ensure a smooth setup process!
`;

export function Error({ error }: ErrorProps) {
  const { title, message, errorType } = handleError(error);

  showToast({ style: Toast.Style.Failure, title: ERROR_MESSAGES.SOMETHING_WENT_WRONG });

  const getMarkdown = () => {
    if (errorType === "SERVER_CLOSED") {
      return `# ${title}

---

**${message}**

---

> ## Troubleshooting Steps
>
> - **Start the Keeper Commander service** on your machine
> - **Check if the service is running** on ${BASE_API_URL}
> - **Verify the API URL** in extension preferences (eg: must be like http://localhost:9092 or your NGROK URL)
> - **Restart the Keeper Commander service** if it's already running

${COMMON_TROUBLESHOOTING_STEPS}

${HELP_SECTION}`;
    }

    if (errorType === "API_ERROR") {
      return `# ${title}

---

## **${message}**

---

> ## Troubleshooting Steps
>
> - **Check your API URL and API key** in extension preferences
> - **Verify the API key** has correct permissions
> - **Ensure the service is running** and accessible
> - **Try restarting** the Keeper Commander service

${COMMON_TROUBLESHOOTING_STEPS}

${HELP_SECTION}`;
    }

    return `# ${title}

---

> **${message}**

---

> ## Troubleshooting Steps
>
> - **Check your extension preferences configuration** settings
> - **Restart the Keeper Commander service**
> - **Verify your internet connection**

${COMMON_TROUBLESHOOTING_STEPS}

${HELP_SECTION}`;
  };

  return (
    <Detail
      markdown={getMarkdown()}
      actions={
        <ActionPanel>
          <Action icon={Icon.Gear} title="Open Extension Preferences" onAction={openExtensionPreferences} />
          <Action.CopyToClipboard title="Copy Logs" content={JSON.stringify(error)} />
          <CommonActions />
        </ActionPanel>
      }
    />
  );
}
