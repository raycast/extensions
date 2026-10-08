import { Action, ActionPanel, Color, Icon, List, open, showToast, Toast, Keyboard } from "@raycast/api";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { ReactNode, useCallback, useEffect, useRef, useState } from "react";
import { FmError } from "./lib/errors";
import { getLicenseStatus, getModelStatus, isFmInstalled, respond } from "./lib/fm";

const execFileAsync = promisify(execFile);
const APPLE_INTELLIGENCE_SETTINGS = "x-apple.systempreferences:com.apple.Siri-Settings.extension";

type CheckState = "checking" | "ok" | "failed" | "skipped";

interface Check {
  id: string;
  title: string;
  state: CheckState;
  summary: string;
  help: string;
  actions?: ReactNode;
}

async function macOSVersion(): Promise<string> {
  const { stdout } = await execFileAsync("/usr/bin/sw_vers", ["-productVersion"]);
  return stdout.trim();
}

function majorVersion(version: string) {
  return Number.parseInt(version.split(".")[0] ?? "0", 10);
}

const icons: Record<CheckState, { source: Icon; tintColor: Color }> = {
  checking: { source: Icon.CircleProgress, tintColor: Color.SecondaryText },
  ok: { source: Icon.CheckCircle, tintColor: Color.Green },
  failed: { source: Icon.XMarkCircle, tintColor: Color.Red },
  skipped: { source: Icon.Circle, tintColor: Color.SecondaryText },
};

const licenseActions = (
  <>
    <Action.CopyToClipboard title="Copy License Command" content="sudo fm license" />
    <Action.Open title="Open Terminal" target="/System/Applications/Utilities/Terminal.app" icon={Icon.Terminal} />
  </>
);

const modelActions = (
  <Action
    title="Open Apple Intelligence Settings"
    icon={Icon.Gear}
    onAction={() => open(APPLE_INTELLIGENCE_SETTINGS)}
  />
);

export default function Command() {
  const [checks, setChecks] = useState<Check[]>([]);

  const runChecks = useCallback(async () => {
    const results: Check[] = [];
    const publish = (check: Check) => {
      results.push(check);
      setChecks([...results]);
    };
    setChecks([]);

    const version = await macOSVersion().catch(() => "unknown");
    const versionOk = majorVersion(version) >= 27;
    publish({
      id: "macos",
      title: "macOS",
      state: versionOk ? "ok" : "failed",
      summary: `macOS ${version}`,
      help: versionOk
        ? "This Mac runs a macOS version that includes the fm command line tool."
        : "The fm command line tool and Apple's on-device model for apps come with macOS 27. Update macOS in System Settings → General → Software Update.",
    });

    const appleSilicon = process.arch === "arm64";
    publish({
      id: "chip",
      title: "Apple Silicon",
      state: appleSilicon ? "ok" : "failed",
      summary: appleSilicon ? "Apple silicon" : "Intel",
      help: appleSilicon
        ? "Apple Intelligence runs on Macs with Apple silicon (M1 or later)."
        : "Apple Intelligence needs a Mac with Apple silicon (M1 or later).",
    });

    const installed = isFmInstalled();
    publish({
      id: "fm",
      title: "fm Tool",
      state: installed ? "ok" : "failed",
      summary: installed ? "/usr/bin/fm" : "Not found",
      help: installed
        ? "The fm tool is installed. This extension uses it to talk to the on-device model."
        : "/usr/bin/fm was not found. It is part of macOS 27.",
    });
    if (!installed) {
      publish({
        id: "license",
        title: "fm License",
        state: "skipped",
        summary: "Needs fm",
        help: "Install macOS 27 first.",
      });
      publish({
        id: "model",
        title: "On-Device Model",
        state: "skipped",
        summary: "Needs fm",
        help: "Install macOS 27 first.",
      });
      return;
    }

    const license = await getLicenseStatus().catch((error: Error) => ({ accepted: false, message: error.message }));
    publish({
      id: "license",
      title: "fm License",
      state: license.accepted ? "ok" : "failed",
      summary: license.accepted ? "Accepted" : "Not accepted",
      help: license.accepted
        ? license.message
        : `Apple asks you to read and accept the fm license once. Open Terminal, run \`sudo fm license\`, read it and answer \`y\`. This extension never accepts it for you.\n\n\`\`\`\n${license.message}\n\`\`\``,
      actions: license.accepted ? undefined : licenseActions,
    });

    const model = await getModelStatus().catch((error: Error) => ({
      available: false as const,
      message: error.message,
    }));
    publish({
      id: "model",
      title: "On-Device Model",
      state: model.available ? "ok" : "failed",
      summary: model.available ? "Available" : "Not available",
      help: model.available
        ? "Apple Intelligence is on and the model is ready. Press ⌘T to send a short test prompt."
        : `Turn on Apple Intelligence in System Settings → Apple Intelligence & Siri, then keep the Mac on Wi-Fi and power until the model (about 7 GB) has downloaded.\n\n\`\`\`\n${model.message}\n\`\`\``,
      actions: model.available ? undefined : modelActions,
    });
  }, []);

  const testController = useRef<AbortController>(undefined);

  useEffect(() => {
    runChecks();
    // Stops a running test prompt when the command closes.
    return () => testController.current?.abort();
  }, [runChecks]);

  async function testModel() {
    testController.current?.abort();
    const controller = new AbortController();
    testController.current = controller;
    const toast = await showToast({ style: Toast.Style.Animated, title: "Asking the model…" });
    const started = Date.now();
    try {
      const answer = await respond(
        { prompt: "Reply with one short friendly sentence that says you are ready." },
        { signal: controller.signal },
      );
      toast.style = Toast.Style.Success;
      toast.title = `Answered in ${((Date.now() - started) / 1000).toFixed(1)} s`;
      toast.message = answer;
    } catch (error) {
      if (error instanceof FmError && error.kind === "cancelled") return;
      toast.style = Toast.Style.Failure;
      toast.title = "The test failed";
      toast.message = error instanceof FmError ? error.message : String(error);
    }
  }

  const isChecking = checks.length < 5;

  return (
    <List isLoading={isChecking} isShowingDetail navigationTitle="Check Setup">
      {checks.map((check) => (
        <List.Item
          key={check.id}
          title={check.title}
          icon={icons[check.state]}
          accessories={[{ text: check.summary }]}
          detail={<List.Item.Detail markdown={`## ${check.title}\n\n${check.help}`} />}
          actions={
            <ActionPanel>
              {check.actions}
              <Action
                title="Check Again"
                icon={Icon.ArrowClockwise}
                shortcut={Keyboard.Shortcut.Common.Refresh}
                onAction={runChecks}
              />
              <Action
                title="Send Test Prompt"
                icon={Icon.Message}
                shortcut={{ modifiers: ["cmd"], key: "t" }}
                onAction={testModel}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
