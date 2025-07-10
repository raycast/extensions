import { ActionPanel, Action, Icon, List, showToast, Toast, Clipboard } from "@raycast/api";
import { User, useChannels } from "./shared/client";
import { withSlackClient } from "./shared/withSlackClient";
import { handleError } from "./shared/utils";
import { getSlackWebClient } from "./shared/client/WebClient";

function LookupEmail() {
  const { data, isLoading, error } = useChannels();

  // Extract only users from the channels data (which includes users, channels, and groups)
  const users = data?.[0]?.filter((item): item is User => {
    // Check if it's a user by looking for user-specific properties
    return "username" in item && "conversationId" in item;
  });

  if (error) {
    handleError(error, "Failed to load users");
  }

  async function fetchAndCopyEmail(user: User) {
    try {
      await showToast({
        style: Toast.Style.Animated,
        title: "Fetching email...",
        message: `Getting email for ${user.name}`,
      });

      // Fetch email for this specific user only when needed
      const slackWebClient = getSlackWebClient();
      const userInfo = await slackWebClient.users.info({ user: user.id });
      const email = userInfo.user?.profile?.email;

      if (email) {
        await Clipboard.copy(email);
        await showToast({
          style: Toast.Style.Success,
          title: "Email copied!",
          message: email,
        });
      } else {
        await showToast({
          style: Toast.Style.Failure,
          title: "No email found",
          message: "This user doesn't have an email address visible to you",
        });
      }
    } catch (error) {
      console.error("Failed to fetch email:", error);

      let errorMessage = "Unknown error";
      if (error instanceof Error) {
        if (error.message.includes("rate_limited")) {
          errorMessage = "Rate limited. Please wait a moment and try again.";
        } else if (error.message.includes("missing_scope")) {
          errorMessage = "Missing 'users:read.email' permission. Please re-authorize.";
        } else {
          errorMessage = error.message;
        }
      }

      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to fetch email",
        message: errorMessage,
      });
    }
  }

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search for a user by name..."
      navigationTitle={`Email Lookup ${users ? `(${users.length} users)` : ""}`}
    >
      {users?.map((user) => {
        return (
          <List.Item
            key={user.id}
            title={user.name}
            subtitle={user.title}
            icon={user.icon}
            accessories={[
              {
                text: user.statusText,
                icon: user.statusEmoji ? { source: Icon.Message, tintColor: "#000" } : undefined,
              },
            ]}
            actions={
              <ActionPanel>
                <ActionPanel.Section>
                  <Action
                    title="Copy Email Address"
                    icon={Icon.Envelope}
                    onAction={() => fetchAndCopyEmail(user)}
                    shortcut={{ modifiers: ["cmd"], key: "return" }}
                  />
                  <Action
                    title="Copy Name"
                    icon={Icon.Person}
                    onAction={async () => {
                      await Clipboard.copy(user.name);
                      await showToast({
                        style: Toast.Style.Success,
                        title: "Name copied!",
                        message: user.name,
                      });
                    }}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                  />
                  <Action
                    title="Copy Name <Email>"
                    icon={Icon.Document}
                    onAction={async () => {
                      try {
                        await showToast({
                          style: Toast.Style.Animated,
                          title: "Fetching email...",
                        });

                        const slackWebClient = getSlackWebClient();
                        const userInfo = await slackWebClient.users.info({ user: user.id });
                        const email = userInfo.user?.profile?.email;

                        if (email) {
                          const formatted = `${user.name} <${email}>`;
                          await Clipboard.copy(formatted);
                          await showToast({
                            style: Toast.Style.Success,
                            title: "Copied!",
                            message: formatted,
                          });
                        } else {
                          await showToast({
                            style: Toast.Style.Failure,
                            title: "No email found",
                          });
                        }
                      } catch (error) {
                        await showToast({
                          style: Toast.Style.Failure,
                          title: "Failed to fetch email",
                        });
                      }
                    }}
                    shortcut={{ modifiers: ["cmd", "opt"], key: "c" }}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}

export default withSlackClient(LookupEmail);
