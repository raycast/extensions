import { Action, ActionPanel, Detail, Icon, openExtensionPreferences } from "@raycast/api";
import { useLogin } from "../lib/useLogin";
import { ReactElement, useEffect } from "react";

export const Authenticated = ({
  children,
  setLoggedIn,
}: {
  children: ReactElement;
  setLoggedIn: (loggedIn: boolean) => void;
}) => {
  const { error, loggedIn } = useLogin();

  useEffect(() => {
    setLoggedIn(loggedIn);
  }, [loggedIn]);

  if (error) {
    return (
      <Detail
        markdown={`
# ‼️ Failed to connect to traggo server
\`\`\`
${error}
\`\`\`
---
> Please check your credentials in the extension preferences, make sure the traggo server is running and re-run this command.
`}
        actions={
          <ActionPanel>
            <Action title="Open Preferences" onAction={openExtensionPreferences} icon={Icon.Cog} />
          </ActionPanel>
        }
      />
    );
  }

  return children;
};
