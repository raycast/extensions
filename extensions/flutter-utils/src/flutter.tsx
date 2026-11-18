import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Action, ActionPanel, Detail, Form, Icon, List, useNavigation, getPreferenceValues } from "@raycast/api";
import { resolveProjectPath, showErrorToast, buildFlutterCommand, runInWarp, showSuccessHUD } from "./utils";
import { spawn } from "node:child_process";

/**
 * Set of Flutter action keys available in the UI.
 */
type FlutterActionKey =
  | "run"
  | "pub-get"
  | "clean"
  | "analyze"
  | "test"
  | "build-apk"
  | "build-appbundle"
  | "build-ios"
  | "doctor";

type FlutterAction = {
  key: FlutterActionKey;
  title: string;
  subtitle: string;
  icon: Icon;
  /**
   * Determines whether the action should run in a Terminal (interactive)
   * or in the background (exec).
   */
  interactive: boolean;
  /**
   * Base flutter subcommand (e.g. "run", "build apk", "analyze").
   */
  commandBase: string;
};

const ACTIONS: FlutterAction[] = [
  { key: "run", title: "Run", subtitle: "Launch the app", icon: Icon.Play, interactive: true, commandBase: "run" },
  {
    key: "pub-get",
    title: "Pub Get",
    subtitle: "Fetch dependencies",
    icon: Icon.ArrowDownCircle,
    interactive: false,
    commandBase: "pub get",
  },
  {
    key: "clean",
    title: "Clean",
    subtitle: "Clean build",
    icon: Icon.Trash,
    interactive: false,
    commandBase: "clean",
  },
  {
    key: "analyze",
    title: "Analyze",
    subtitle: "Analyze code (linter)",
    icon: Icon.MagnifyingGlass,
    interactive: false,
    commandBase: "analyze",
  },
  {
    key: "test",
    title: "Test",
    subtitle: "Run tests",
    icon: Icon.Checkmark,
    interactive: false,
    commandBase: "test",
  },
  {
    key: "build-apk",
    title: "Build APK",
    subtitle: "Build Android APK",
    icon: Icon.Gear,
    interactive: false,
    commandBase: "build apk",
  },
  {
    key: "build-appbundle",
    title: "Build AppBundle",
    subtitle: "Build Android AppBundle",
    icon: Icon.Gear,
    interactive: false,
    commandBase: "build appbundle",
  },
  {
    key: "build-ios",
    title: "Build iOS",
    subtitle: "Build iOS app",
    icon: Icon.Gear,
    interactive: false,
    commandBase: "build ios",
  },
  {
    key: "doctor",
    title: "Doctor",
    subtitle: "Diagnose environment",
    icon: Icon.Shield,
    interactive: false,
    commandBase: "doctor",
  },
];

/**
 * Main screen listing Flutter actions.
 * Selecting one pushes a form allowing to add arguments.
 */
export default function CommandFlutter() {
  return (
    <List searchBarPlaceholder="Search Flutter actions...">
      {ACTIONS.map((action) => (
        <List.Item
          key={action.key}
          title={action.title}
          subtitle={action.subtitle}
          icon={action.icon}
          actions={
            <ActionPanel>
              <Action.Push title="Add Arguments" icon={Icon.Terminal} target={<ArgumentsForm action={action} />} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

type ArgumentsFormValues = {
  args?: string;
  deviceId?: string;
};

/**
 * Form allowing the user to provide additional arguments for a Flutter action.
 */
/**
 * Represents a Flutter device (id usable with `-d`, name, platform).
 */
type DeviceItem = { id: string; name: string; platform: string };

/**
 * Arguments form for executing a Flutter action.
 * - For "run": offers device selection and additional arguments
 * - For other actions: offers free additional arguments
 */
function ArgumentsForm({ action }: { action: FlutterAction }) {
  const { push } = useNavigation();
  const [devices, setDevices] = useState<DeviceItem[]>([]);
  const [loadingDevices, setLoadingDevices] = useState(false);

  useEffect(() => {
    async function fetchDevices() {
      if (action.key !== "run") return;
      setLoadingDevices(true);
      try {
        const prefs = getPreferenceValues<Preferences>();
        const env = buildEnvWithSdk(prefs.flutterSdkPath);
        const child = spawn("flutter devices --machine", { shell: true, env });
        let out = "";
        child.stdout?.on("data", (d: Buffer) => (out += d.toString()));
        child.stderr?.on("data", (d: Buffer) => (out += d.toString()));
        child.on("close", () => {
          try {
            // Sanitization: strictly extract the JSON array if noisy lines exist
            let jsonText = out.trim();
            const startIdx = jsonText.indexOf("[");
            const endIdx = jsonText.lastIndexOf("]");
            if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
              jsonText = jsonText.slice(startIdx, endIdx + 1);
            }
            const arr = JSON.parse(jsonText) as Array<{ id: string; name: string; targetPlatform?: string }>;
            setDevices(arr.map((d) => ({ id: d.id, name: d.name, platform: d.targetPlatform ?? "" })));
          } catch {
            setDevices([]);
          } finally {
            setLoadingDevices(false);
          }
        });
      } catch {
        setDevices([]);
        setLoadingDevices(false);
      }
    }
    fetchDevices();
  }, [action.key]);
  const onSubmit = useCallback(
    async (values: ArgumentsFormValues) => {
      const extraArgs = (values.args ?? "").trim();
      try {
        const cwd = await resolveProjectPath();
        if (action.key === "run") {
          const deviceArg = values.deviceId && values.deviceId !== "auto" ? ` -d ${values.deviceId}` : "";
          const runArgs = `${deviceArg}${extraArgs.length > 0 ? ` ${extraArgs}` : ""}`;
          // If multiple devices and none selected, ask the user to choose
          if (devices.length > 1 && (!values.deviceId || values.deviceId === "auto")) {
            await showErrorToast("Multiple devices detected", "Select a device or use -d");
            return;
          }
          // Always open in Warp (interactive)
          await runInWarp(buildFlutterCommand(`${action.commandBase}${runArgs}`), cwd);
          await showSuccessHUD("Opened in Warp (interactive)");
          return;
        }

        const argsSuffix = extraArgs.length > 0 ? ` ${extraArgs}` : "";
        push(
          <ProgressView
            title={`flutter ${action.commandBase}`}
            command={buildFlutterCommand(`${action.commandBase}${argsSuffix}`)}
            cwd={cwd}
          />,
        );
      } catch (error) {
        await showErrorToast("Execution failed", String(error instanceof Error ? error.message : error));
      }
    },
    [action, devices.length],
  );

  return (
    <Form
      navigationTitle={`Flutter ${action.title}`}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Execute" onSubmit={onSubmit} />
        </ActionPanel>
      }
    >
      {action.key === "run" && (
        <Form.Dropdown id="deviceId" title="Device" storeValue>
          <Form.Dropdown.Item value="auto" title={loadingDevices ? "Loading..." : "Auto (let Flutter choose)"} />
          <Form.Dropdown.Item value="all" title="All devices (-d all)" />
          {devices.map((d) => (
            <Form.Dropdown.Item key={d.id} value={d.id} title={`${d.name}${d.platform ? ` (${d.platform})` : ""}`} />
          ))}
        </Form.Dropdown>
      )}
      <Form.Description
        text={
          action.key === "run"
            ? "Add extra arguments for the command. Leave empty if none."
            : "You can provide additional arguments (optional)."
        }
      />
      <Form.TextField
        id="args"
        title="Arguments"
        placeholder={action.key === "run" ? "e.g. --flavor prod" : "e.g. --coverage, --release"}
      />
    </Form>
  );
}

type ProgressViewProps = {
  title: string;
  command: string;
  cwd: string;
};

/**
 * Execution statuses of an external process.
 */
enum ExecutionStatus {
  Pending = "pending",
  Running = "running",
  Success = "success",
  Error = "error",
}

/**
 * Progress view displaying the execution of a command with live logs.
 */
function ProgressView({ title, command, cwd }: ProgressViewProps) {
  const [lines, setLines] = useState<string[]>([]);
  const [status, setStatus] = useState<ExecutionStatus>(ExecutionStatus.Pending);
  const childRef = useRef<ReturnType<typeof spawn> | null>(null);
  const spawnErrorRef = useRef<string | null>(null);

  /**
   * Determines whether a line corresponds to the standard interactive help shown by `flutter run`.
   * Examples of hidden lines:
   *  - "Flutter run key commands."
   *  - "h List all available interactive commands."
   *  - "c Clear the screen"
   *  - "q Quit (terminate the application on the device)."
   * These lines are useful in an interactive terminal but noisy for the UI logs.
   */
  function isFlutterRunInteractiveHelpLine(line: string): boolean {
    const trimmed = line.trim();
    if (trimmed.length === 0) return false;
    if (/^Flutter run key commands\.?$/i.test(trimmed)) return true;
    // Targeted filter on the mentioned lines (h/c/q). Can be expanded if needed.
    if (/^h\s+List all available interactive commands\.?/i.test(trimmed)) return true;
    if (/^c\s+Clear the screen/i.test(trimmed)) return true;
    if (/^q\s+Quit\b/i.test(trimmed)) return true;
    return false;
  }

  useEffect(() => {
    const prefs = getPreferenceValues<Preferences>();
    const env = buildEnvWithSdk(prefs.flutterSdkPath);
    const child = spawn(command, { cwd, shell: true, env });
    childRef.current = child;

    const handleData = (data: Buffer) => {
      const text = data.toString();
      if (text.trim().length > 0) {
        setStatus((prev) => (prev === ExecutionStatus.Pending ? ExecutionStatus.Running : prev));
      }
      const incomingLines = text.split("\n");
      const visibleLines = incomingLines.filter((l) => !isFlutterRunInteractiveHelpLine(l));
      setLines((prev) => [...prev, ...visibleLines]);
    };

    const onStdout = handleData;
    const onStderr = handleData;
    const onError = (err: Error) => {
      // Do not display immediately; only display if the process fails
      spawnErrorRef.current = err.message;
    };
    const onClose = () => {
      // no-op: final decision is taken on 'exit'
      return;
    };
    const onExit = (code: number | null, signal: NodeJS.Signals | null) => {
      if (code !== null) {
        setLines((prev) => [...prev, `Process exited with code ${code}`]);
      } else if (signal) {
        setLines((prev) => [...prev, `Process terminated by signal ${signal}`]);
      }
      if (code !== 0 && spawnErrorRef.current) {
        setLines((prev) => [...prev, `spawn error: ${spawnErrorRef.current}`]);
      }
      setStatus(code === 0 ? ExecutionStatus.Success : ExecutionStatus.Error);
    };

    child.stdout?.on("data", onStdout);
    child.stderr?.on("data", onStderr);
    child.on("error", onError);
    child.on("close", onClose);
    child.on("exit", onExit);

    return () => {
      try {
        child.stdout?.off("data", onStdout);
        child.stderr?.off("data", onStderr);
        child.off("error", onError);
        child.off("close", onClose);
        child.off("exit", onExit);
        // If the process is still running (navigated back or view closed), kill it to avoid duplicates
        if (child.exitCode === null) {
          try {
            child.kill();
          } catch {
            // ignore kill errors
          }
        }
      } finally {
        childRef.current = null;
      }
    };
  }, [command, cwd]);

  /**
   * Formats lines as a diff to leverage Raycast native colors:
   *  - "+" green for successes
   *  - "-" red for errors
   *  - warnings are prefixed with "⚠️ " (no dedicated color in diff)
   *  - steps are prefixed with "▶️ "
   */
  function formatLogLinesForDiff(sourceLines: string[]): string {
    const toDiff = (line: string): string => {
      const trimmed = line.trim();
      if (trimmed.length === 0) return line;

      // Steps / headings
      if (/^(Doctor summary|Running|Building|Resolving|Downloading|Analyzing|Test|Launching)/i.test(trimmed)) {
        return ` ${"▶️ "}${line}`;
      }
      // Waiting
      if (/^Waiting for another flutter command/i.test(trimmed)) {
        return ` ${"⚠️ "}${line}`;
      }
      // Success
      if (/^\[✓\]|(succeeded|success|All tests passed|Process exited with code 0)/i.test(trimmed)) {
        return `+ ${line}`;
      }
      // Warnings
      if (/(warning|WARN|not accepted|deprecated)/i.test(trimmed)) {
        return ` ${"⚠️ "}${line}`;
      }
      // Errors
      if (/^(\[✗|\[x\]|\[X\]|!|error|Error|ERROR)/.test(trimmed) || /Exception|Unhandled|Traceback/.test(trimmed)) {
        return `- ${line}`;
      }
      return ` ${line}`;
    };
    return sourceLines.map((l) => toDiff(l)).join("\n");
  }

  const markdown = useMemo(() => {
    const headerText =
      status === ExecutionStatus.Pending
        ? "Preparing…"
        : status === ExecutionStatus.Running
          ? "Running…"
          : status === ExecutionStatus.Success
            ? "Completed successfully ✅"
            : status === ExecutionStatus.Error
              ? "Error ❌"
              : "";
    const headerIcon =
      status === ExecutionStatus.Pending
        ? "⏳"
        : status === ExecutionStatus.Running
          ? "🏃"
          : status === ExecutionStatus.Success
            ? "✅"
            : status === ExecutionStatus.Error
              ? "❌"
              : "";
    const header = `# ${headerIcon} ${title}\n\n${headerText}`;
    const bodyDiff = formatLogLinesForDiff(lines);
    const body = `\n\n\`\`\`diff\n${bodyDiff}\n\`\`\``; // code block diff
    return header + body;
  }, [title, status, lines]);

  return (
    <Detail isLoading={status === ExecutionStatus.Pending || status === ExecutionStatus.Running} markdown={markdown} />
  );
}

/**
 * Builds a PATH with the Flutter SDK if provided for spawned processes.
 */
function buildEnvWithSdk(sdkPath?: string): NodeJS.ProcessEnv {
  const env = { ...process.env } as NodeJS.ProcessEnv;
  const defaultPath = "/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin";
  env.PATH = env.PATH ? `${env.PATH}:${defaultPath}` : defaultPath;
  if (sdkPath && sdkPath.length > 0) {
    const binDir = `${sdkPath.replace(/\/$/, "")}/bin`;
    env.PATH = `${binDir}:${env.PATH}`;
  }
  return env;
}
// AutoProgress kept previously, removed as all flows go through ArgumentsForm.
