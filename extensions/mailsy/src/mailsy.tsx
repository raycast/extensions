import { useCallback, useEffect, useState } from "react";
import { Action, ActionPanel, Detail, Icon, List, showToast, Toast } from "@raycast/api";
import { createAccount } from "./libs/api";
import { isLoggedIn } from "./libs/utils";
import { Mail } from "./components/Mail";

export default function Command() {
  const [bootstrapState, setBootstrapState] = useState<
    { status: "loading" } | { status: "ready" } | { status: "error"; message: string }
  >({ status: "loading" });

  const bootstrap = useCallback(async () => {
    setBootstrapState({ status: "loading" });

    try {
      const loggedIn = await isLoggedIn();
      if (loggedIn) {
        setBootstrapState({ status: "ready" });
      } else {
        await showToast(Toast.Style.Animated, "Creating account...");
        await createAccount();
        await showToast(Toast.Style.Success, "Account created successfully");
        setBootstrapState({ status: "ready" });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to initialize account";
      await showToast(Toast.Style.Failure, "Account creation failed", message);
      setBootstrapState({ status: "error", message });
    }
  }, []);

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  if (bootstrapState.status === "loading") {
    return (
      <List isLoading>
        <List.EmptyView title="Loading..." />
      </List>
    );
  }

  if (bootstrapState.status === "error") {
    return (
      <Detail
        markdown={`# Failed to initialize mailbox\n\n${bootstrapState.message}`}
        actions={
          <ActionPanel>
            <Action title="Retry" icon={Icon.ArrowClockwise} onAction={() => void bootstrap()} />
          </ActionPanel>
        }
      />
    );
  }

  return <Mail />;
}
