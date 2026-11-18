import { Action, ActionPanel, Color, Image, List, openExtensionPreferences } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useContext, useEffect } from "react";
import { SetupContext } from "./SparkSetup";
import { SetupStep, setupStep } from "../lib/setup";
import { SparkError } from "../lib/spark";
import { SPARK_APP_ICON, actionIcon, sparkAppIconForEmptyView, sparkIcon } from "../lib/sparkIcons";
import { DOWNLOAD_URL, launchSpark, openAgentSettings } from "../lib/ui";

/// An empty view with nothing in it still gets Raycast's magnifier placeholder;
/// a transparent icon keeps it blank.
const BLANK = {
  source: `data:image/svg+xml;base64,${Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"/>').toString("base64")}`,
};

interface Screen {
  /// The Spark app icon when left out.
  icon?: Image.ImageLike;
  title: string;
  description: string;
}

const SETUP_SCREENS: Record<SetupStep, Screen> = {
  download: {
    title: "Spark Desktop is required",
    description:
      "Spark for Raycast works with Spark Desktop for Mac and Windows. Download it, sign in, then turn on Spark CLI in Settings → AI Agents.",
  },
  enable: {
    title: "Turn on Spark CLI",
    description:
      "Raycast reaches your mail through Spark CLI. In Spark, open Settings → AI Agents and turn on Spark CLI Setup.",
  },
  launch: {
    title: "Spark isn't running",
    description: "Open Spark Desktop, then try again.",
  },
  update: {
    icon: sparkIcon("UpdateApp", Color.SecondaryText),
    title: "Update Spark",
    description: "This extension needs a newer Spark Desktop. Update Spark, then try again.",
  },
};

/// Empty state for a failure: the setup step that's missing, with the action
/// that completes it, or what went wrong.
export default function ErrorView({ error, onRetry }: { error: Error; onRetry?: () => void }) {
  const { data: step, isLoading } = usePromise(setupStep, [error], { onError: () => undefined });
  const showSetup = useContext(SetupContext);
  const retry = onRetry && <Action title="Try Again" icon={actionIcon("SidebarFetchMessages")} onAction={onRetry} />;

  // A command shows the full setup screen in its place; a screen opened from
  // one can't, so it shows the step here.
  useEffect(() => {
    if (step && showSetup) showSetup(step);
  }, [step, showSetup]);

  // Working out the step takes a moment (it looks for Spark); show nothing
  // rather than a screen that's about to change.
  if (isLoading || (step && showSetup)) return <List.EmptyView icon={BLANK} />;

  if (step) {
    const screen = SETUP_SCREENS[step];
    return (
      <List.EmptyView
        icon={screen.icon ?? sparkAppIconForEmptyView()}
        title={screen.title}
        description={screen.description}
        actions={
          <ActionPanel>
            {step === "download" && (
              <Action.OpenInBrowser title="Download Spark Desktop" icon={SPARK_APP_ICON} url={DOWNLOAD_URL} />
            )}
            {step === "enable" && (
              <Action title="Open Spark Settings" icon={actionIcon("Settings")} onAction={openAgentSettings} />
            )}
            {step === "launch" && <Action title="Open Spark" icon={SPARK_APP_ICON} onAction={launchSpark} />}
            {step === "update" && (
              <Action.OpenInBrowser title="Download Latest Spark" icon={SPARK_APP_ICON} url={DOWNLOAD_URL} />
            )}
            {retry}
            {(step === "enable" || step === "download") && (
              <Action title="Set Spark CLI Path…" icon={actionIcon("Settings")} onAction={openExtensionPreferences} />
            )}
          </ActionPanel>
        }
      />
    );
  }

  const accessDenied = error instanceof SparkError && error.kind === "accessDenied";
  return (
    <List.EmptyView
      icon={sparkIcon("ErrorGeneral", Color.SecondaryText)}
      title={accessDenied ? "Not allowed by Spark access level" : "Something went wrong"}
      description={
        accessDenied
          ? "Raycast follows Spark's AI agent access levels. Change them in Spark → Settings → AI Agents."
          : error.message
      }
      actions={
        <ActionPanel>
          {accessDenied && (
            <Action title="Open Spark Settings" icon={actionIcon("Settings")} onAction={openAgentSettings} />
          )}
          {retry}
        </ActionPanel>
      }
    />
  );
}
