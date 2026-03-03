import {
  MenuBarExtra,
  open,
  Icon,
  Color,
  getPreferenceValues,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { useAuth, streamChat, Message } from "./shared";

export default function Command() {
  const preferences = getPreferenceValues<{ enableAutoPing: boolean }>();
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

      const messages: Message[] = [
        {
          role: "user",
          content: "Ping! Are you there? Just say 'pong' if you are.",
        },
      ];

      let gotResponse = false;

      const ac = new AbortController();

      try {
        await streamChat(
          ghoToken,
          messages,
          () => {
            gotResponse = true;
          },
          () => {
            if (mounted) {
              setStatus(gotResponse ? "active" : "error");
              setLastChecked(new Date());
            }
          },
          (err) => {
            if (mounted) {
              setStatus("error");
              setErrorMessage(err instanceof Error ? err.message : String(err));
              setLastChecked(new Date());
            }
          },
          ac.signal,
          "gpt-4o",
        );
      } catch (e) {
        if (mounted) {
          setStatus("error");
          setErrorMessage(e instanceof Error ? e.message : String(e));
          setLastChecked(new Date());
        }
      }

      // Stop the stream early since we only needed a ping
      setTimeout(() => ac.abort(), 2000);
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
