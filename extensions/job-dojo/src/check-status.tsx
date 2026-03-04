import {
  Action,
  ActionPanel,
  Detail,
  Icon,
  showToast,
  Toast,
} from "@raycast/api";
import { useState, useCallback, useEffect } from "react";
import { fetchUserInfo, UserInfo } from "./api";

export default function CheckStatusCommand() {
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const user = await fetchUserInfo();
      setUserInfo(user);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "An error occurred";
      setError(errorMessage);
      showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const getStatusEmoji = (hasItem: boolean) => (hasItem ? "✅" : "❌");

  const markdown = error
    ? `## Error\n\n${error}\n\nPlease check your API key in the extension preferences.`
    : userInfo
      ? `## Job Dojo Status

### Account
- **Name:** ${userInfo.user.name || "Not set"}
- **Email:** ${userInfo.user.email}
- **Plan:** ${userInfo.membership.plan === "pro" ? "🌟 Pro" : "Free"}

### Usage
- **Messages Used:** ${userInfo.membership.messagesUsage}

### Profile Setup
- ${getStatusEmoji(userInfo.resume.hasResume)} Resume uploaded
- ${getStatusEmoji(userInfo.resume.hasAboutMe)} About Me section filled
- ${getStatusEmoji(userInfo.resume.hasPassionateAbout)} "Passionate About" section filled

${!userInfo.resume.hasResume || !userInfo.resume.hasAboutMe ? `\n> **Note:** To use message and connection templates, please complete your profile at [jobdojo.app/settings](https://jobdojo.app/settings)\n` : ""}
`
      : `## Loading...\n\n_Fetching your account status..._`;

  return (
    <Detail
      markdown={markdown}
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser
            title="Open Job Dojo"
            url="https://jobdojo.app"
          />
          <Action.OpenInBrowser
            title="Go to Settings"
            url="https://jobdojo.app/settings"
          />
          <Action
            title="Refresh"
            icon={Icon.RotateClockwise}
            onAction={fetchData}
          />
        </ActionPanel>
      }
    />
  );
}
