import {
  MenuBarExtra,
  open,
  Icon,
  Color,
  getPreferenceValues,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { useAuth, getCopilotToken } from "./shared";

export default function Command() {
  const preferences = getPreferenceValues<Preferences.CopilotStatus>();
  const { ghoToken, logout } = useAuth();
  const [status, setStatus] = useState<
    "loading" | "active" | "error" | "unauthorized"
  >("loading");
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);

  const handleRefresh = () => {
    setRefreshTick((t) => t + 1);
  };

  useEffect(() => {
    let mounted = true;

    async function checkStatus() {
      if (!ghoToken) {
        if (mounted) setStatus("unauthorized");
        return;
      }

      if (mounted) {
        setStatus("loading");
        setErrorMessage(null);
      }

      try {
        // getCopilotToken is a single small JSON request — it proves both that
        // the GHO token is valid and that the user has an active Copilot subscription.
        // It also caches the result until expiry, so repeat checks are instant.
        await getCopilotToken(ghoToken);
        if (mounted) {
          setStatus("active");
          setLastChecked(new Date());
        }
      } catch (e) {
        if (mounted) {
          setStatus("error");
          setErrorMessage(e instanceof Error ? e.message : String(e));
          setLastChecked(new Date());
        }
      }
    }

    checkStatus();

    let interval: NodeJS.Timeout | undefined;
    // Re-check every 15 minutes if auto-ping is enabled
    if (preferences.enableAutoPing) {
      interval = setInterval(checkStatus, 15 * 60 * 1000);
    }

    return () => {
      mounted = false;
      if (interval) clearInterval(interval);
    };
  }, [ghoToken, refreshTick]);

  const getIcon = () => {
    switch (status) {
      case "loading":
        return { source: Icon.ArrowClockwise, tintColor: Color.SecondaryText };
      case "active":
        return { source: Icon.CheckCircle, tintColor: Color.Green };
      case "error":
        return { source: Icon.XMarkCircle, tintColor: Color.Red };
      case "unauthorized":
        return { source: Icon.Lock, tintColor: Color.Orange };
    }
  };

  const getTitle = () => {
    switch (status) {
      case "loading":
        return "Copilot: Checking...";
      case "active":
        return "Copilot: Active";
      case "error":
        return "Copilot: Error";
      case "unauthorized":
        return "Copilot: Auth Needed";
    }
  };

  return (
    <MenuBarExtra
      icon={getIcon()}
      tooltip="GitHub Copilot Status"
      isLoading={status === "loading"}
    >
      <MenuBarExtra.Item
        title={getTitle()}
        subtitle={
          lastChecked ? `Last checked: ${lastChecked.toLocaleTimeString()}` : ""
        }
      />

      {errorMessage && <MenuBarExtra.Item title={`Error: ${errorMessage}`} />}
      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title="Refresh Status"
          icon={Icon.ArrowClockwise}
          onAction={handleRefresh}
          shortcut={{ modifiers: ["cmd"], key: "r" }}
        />
        <MenuBarExtra.Item
          title={ghoToken ? "Logout from Copilot" : "Login to Copilot"}
          icon={ghoToken ? Icon.Logout : Icon.Person}
          onAction={async () => {
            if (ghoToken) {
              await logout();
              setRefreshTick((t) => t + 1);
            } else {
              open("raycast://extensions/nazif/copilot-chat/index");
            }
          }}
        />
      </MenuBarExtra.Section>
      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title="Open Copilot Chat"
          icon={Icon.Message}
          onAction={() => open("raycast://extensions/nazif/copilot-chat/index")}
          shortcut={{ modifiers: ["cmd"], key: "o" }}
        />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
