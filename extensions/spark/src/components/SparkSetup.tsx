import { Action, ActionPanel, Detail, environment, openExtensionPreferences, showToast, Toast } from "@raycast/api";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ReactNode, createContext, useCallback, useContext, useEffect, useState } from "react";
import { imageFile } from "../lib/files";
import { SetupStep, setupStep } from "../lib/setup";
import { setupCardSVG } from "../lib/setupCard";
import { sparkJSON } from "../lib/spark";
import { SPARK_APP_ICON, actionIcon } from "../lib/sparkIcons";
import { DOWNLOAD_URL, launchSpark, openAgentSettings, showSparkFailure } from "../lib/ui";

/// How often the setup screen asks Spark again, so it gives way to the
/// command as soon as the missing step is done.
const CHECK_INTERVAL_MS = 2000;

/// Asks Spark for its accounts - the cheapest call that goes all the way to
/// Spark Desktop - and returns the setup step still missing, if any. Only the
/// setup screen asks, to find out when it can give way to the command.
async function missingStep(): Promise<SetupStep | undefined> {
  try {
    await sparkJSON(["accounts"], { timeout: 10_000 });
    return undefined;
  } catch (error) {
    return error instanceof Error ? setupStep(error) : undefined;
  }
}

/// Lets an error view inside a command hand a missing setup step up to the
/// command, which then shows the setup screen in its place.
export const SetupContext = createContext<((step: SetupStep) => void) | undefined>(undefined);

/// An `onError` for a form's lookups: when Spark can't be reached at all, the
/// command shows the setup screen (a screen opened from one gets a toast
/// naming the step); anything else gets the usual failure toast.
export function useSparkErrorHandler(title: string): (error: Error) => void {
  const showSetup = useContext(SetupContext);
  return useCallback(
    async (error: Error) => {
      const step = showSetup && (await setupStep(error));
      if (step && showSetup) showSetup(step);
      else await showSparkFailure(error, title);
    },
    [showSetup, title],
  );
}

/// Wraps a command so a failure to reach Spark - missing, off, not running, or
/// too old - replaces it with the setup screen until that's fixed. Nothing is
/// checked up front: the command loads as usual, and its error view reports
/// the step.
export function withSparkCLI<P extends object>(Command: (props: P) => ReactNode) {
  return function SparkCommand(props: P) {
    const [step, setStep] = useState<SetupStep>();

    const check = useCallback(async () => {
      const missing = await missingStep();
      setStep(missing);
      return missing;
    }, []);

    useEffect(() => {
      if (!step) return;
      const timer = setInterval(check, CHECK_INTERVAL_MS);
      return () => clearInterval(timer);
    }, [step]);

    if (!step) {
      return (
        <SetupContext.Provider value={setStep}>
          <Command {...props} />
        </SetupContext.Provider>
      );
    }
    return (
      <SetupView
        step={step}
        onContinue={async () => {
          const missing = await check();
          if (missing) await showToast({ style: Toast.Style.Failure, title: STILL_MISSING[missing] });
        }}
      />
    );
  };
}

const STILL_MISSING: Record<SetupStep, string> = {
  download: "Spark Desktop isn't installed yet",
  enable: "Spark CLI is still off",
  launch: "Spark still isn't running",
  update: "Spark still needs an update",
};

interface Card {
  intro: string;
  steps: string[];
}

const CARDS: Record<SetupStep, Card> = {
  download: {
    intro: "This extension works with Spark Desktop for Mac and Windows. To start using it:",
    steps: [
      "Download and install Spark Desktop",
      "Sign in to your email accounts",
      "In Settings → AI Agents, turn on Spark CLI",
    ],
  },
  enable: {
    intro: "Before you can use this extension, turn on Spark CLI in Spark Desktop:",
    steps: [
      "Open Spark → Settings → AI Agents",
      "Turn on Spark CLI Setup",
      "Choose what Raycast can do with each account",
    ],
  },
  launch: {
    intro: "Spark Desktop isn't running. Open it to use this extension.",
    steps: [],
  },
  update: {
    intro: "This extension needs a newer Spark Desktop:",
    steps: ["Update Spark Desktop", "In Settings → AI Agents, run Spark CLI Setup again"],
  },
};

function SetupView({ step, onContinue }: { step: SetupStep; onContinue: () => void }) {
  return (
    <Detail
      navigationTitle="Set Up Spark"
      markdown={setupCard(step)}
      actions={
        <ActionPanel>
          {step === "download" && (
            <Action.OpenInBrowser title="Download Spark Desktop" icon={SPARK_APP_ICON} url={DOWNLOAD_URL} />
          )}
          {step === "enable" && (
            <Action title="Open Spark Settings" icon={SPARK_APP_ICON} onAction={openAgentSettings} />
          )}
          {step === "launch" && <Action title="Open Spark" icon={SPARK_APP_ICON} onAction={launchSpark} />}
          {step === "update" && (
            <Action.OpenInBrowser title="Download Latest Spark" icon={SPARK_APP_ICON} url={DOWNLOAD_URL} />
          )}
          {/* The second action, so ⌘↵ - like Raycast's own setup screen. */}
          <Action title="Continue" icon={actionIcon("Checkmark")} onAction={onContinue} />
          {(step === "download" || step === "enable") && (
            <Action title="Set Spark CLI Path…" icon={actionIcon("Settings")} onAction={openExtensionPreferences} />
          )}
        </ActionPanel>
      }
    />
  );
}

function setupCard(step: SetupStep): string {
  const card = setupCardSVG({
    icon: appIcon(),
    title: "Spark",
    ...CARDS[step],
    dark: environment.appearance === "dark",
  });
  const url = imageFile("setup", card.uri);
  return url ? `![](${url}?raycast-width=${card.width}&raycast-height=${card.height})` : "";
}

function appIcon(): string | undefined {
  try {
    return readFileSync(join(environment.assetsPath, "icon.png")).toString("base64");
  } catch {
    return undefined;
  }
}
