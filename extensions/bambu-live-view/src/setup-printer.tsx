import {
  Action,
  ActionPanel,
  Alert,
  Color,
  confirmAlert,
  Form,
  Icon,
  Image,
  Keyboard,
  List,
  openExtensionPreferences,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { runAppleScript, useForm, usePromise } from "@raycast/utils";
import { useState } from "react";
import { clearConfig, loadConfig, PrinterConfig, saveConfig, validateAccessCode, validateIp } from "./lib/config";
import { openLiveView } from "./lib/live-view";
import { BREW_INSTALL_COMMAND, findBrew, findMpv } from "./lib/mpv";
import { ConnectionResult, RTSPS_PORT, testConnection } from "./lib/network";

type TestState = { status: "idle" } | { status: "running" } | { status: "done"; result: ConnectionResult };

const done: Image.ImageLike = { source: Icon.CheckCircle, tintColor: Color.Green };
const failed: Image.ImageLike = { source: Icon.XMarkCircle, tintColor: Color.Red };
const todo: Image.ImageLike = { source: Icon.Circle, tintColor: Color.SecondaryText };
const manual: Image.ImageLike = { source: Icon.Info, tintColor: Color.Blue };

const SUPPORTED_MODELS =
  "**Supported printers:** X1 / X1 Carbon / X1E, P2S, H2D and other newer models that stream RTSPS on port 322.\n\n" +
  "**Not supported:** P1P, P1S, A1 and A1 mini — they use a different camera protocol (port 6000) that mpv can't play.";

export default function Command() {
  const [mpvPath, setMpvPath] = useState(findMpv);
  const [test, setTest] = useState<TestState>({ status: "idle" });
  const { data: config, isLoading, revalidate: reloadConfig } = usePromise(loadConfig);
  const { push } = useNavigation();

  async function runTest(ip: string | undefined = config?.ip) {
    if (!ip) {
      await showToast({ style: Toast.Style.Failure, title: "Enter your printer details first" });
      return;
    }
    setTest({ status: "running" });
    const toast = await showToast({ style: Toast.Style.Animated, title: `Testing ${ip}:${RTSPS_PORT}…` });
    const result = await testConnection(ip);
    setTest({ status: "done", result });
    toast.style = result.ok ? Toast.Style.Success : Toast.Style.Failure;
    toast.title = result.title;
    toast.message = result.ok ? undefined : result.message;
  }

  function recheck() {
    setMpvPath(findMpv());
    reloadConfig();
  }

  function openForm() {
    push(
      <PrinterForm
        initial={config}
        onSaved={async (saved) => {
          await reloadConfig();
          await runTest(saved.ip);
        }}
      />,
    );
  }

  async function forget() {
    const confirmed = await confirmAlert({
      title: "Forget printer?",
      message: "This removes the saved IP address and access code from Raycast.",
      primaryAction: { title: "Forget", style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) return;
    await clearConfig();
    setTest({ status: "idle" });
    await reloadConfig();
    await showToast({ style: Toast.Style.Success, title: "Printer details removed" });
  }

  const commonActions = (
    <>
      <Action
        title="Check Again"
        icon={Icon.ArrowClockwise}
        shortcut={Keyboard.Shortcut.Common.Refresh}
        onAction={recheck}
      />
      <Action title="Window Size & Position…" icon={Icon.AppWindow} onAction={openExtensionPreferences} />
      {config && (
        <Action
          title="Forget Printer"
          icon={Icon.Trash}
          style={Action.Style.Destructive}
          shortcut={{ modifiers: ["ctrl"], key: "x" }}
          onAction={forget}
        />
      )}
    </>
  );

  const testResult = test.status === "done" ? test.result : undefined;
  const testIcon =
    test.status === "running"
      ? { source: Icon.CircleProgress, tintColor: Color.Orange }
      : testResult
        ? testResult.ok
          ? done
          : failed
        : todo;
  const ready = Boolean(mpvPath && config);
  const brewPath = findBrew();

  return (
    <List isLoading={isLoading} isShowingDetail navigationTitle="Printer Setup">
      <List.Section title="On the Printer">
        <List.Item
          title="1. Turn on LAN Only Liveview"
          icon={manual}
          detail={
            <List.Item.Detail
              markdown={`## Turn on LAN Only Liveview

On the printer's touchscreen:

1. Open **Settings**.
2. Go to **LAN Only**.
3. Turn on **LAN Only Liveview**.

You can leave the separate **LAN Only** mode switch **off** — Bambu Cloud, Bambu Handy and Bambu Studio keep working normally. Liveview only adds a local camera stream on port ${RTSPS_PORT}.

---

${SUPPORTED_MODELS}`}
            />
          }
          actions={<ActionPanel>{commonActions}</ActionPanel>}
        />
        <List.Item
          title="2. Find IP Address & Access Code"
          icon={manual}
          detail={
            <List.Item.Detail
              markdown={`## Find the IP address and access code

The same **Settings → LAN Only** screen shows:

- **IP address** — e.g. \`192.168.1.50\`
- **Access Code** — 8 characters, e.g. \`12345678\`

The refresh arrow next to the access code generates a new one. If you press it, update the code here too.

### Tip: reserve the IP address

Routers can hand the printer a new IP address after a restart. In your router's settings, look for **DHCP reservation** (sometimes called *static lease* or *address reservation*) and pin the printer's current IP so you never have to update it here.`}
            />
          }
          actions={<ActionPanel>{commonActions}</ActionPanel>}
        />
      </List.Section>

      <List.Section title="On This Mac">
        <List.Item
          title="3. Install mpv"
          icon={mpvPath ? done : failed}
          detail={
            <List.Item.Detail
              markdown={
                mpvPath
                  ? `## mpv is installed ✅\n\nFound at \`${mpvPath}\`.\n\nmpv is the small video player that shows the camera window. (VLC can't play this stream because the printer uses a self-signed certificate.)`
                  : `## Install mpv\n\nmpv is the small video player that shows the camera window. VLC can't play this stream because the printer uses a self-signed certificate.\n\nInstall it with [Homebrew](https://brew.sh):\n\n\`\`\`\n${BREW_INSTALL_COMMAND}\n\`\`\`\n\n${
                      brewPath
                        ? "Press **↵** to run it in a new Terminal window. When it finishes, come back and press **⌘R** to check again."
                        : "Homebrew doesn't seem to be installed. Install it from brew.sh first, or copy the command above to run later."
                    }`
              }
            />
          }
          actions={
            <ActionPanel>
              {!mpvPath && brewPath && (
                <Action
                  title="Install with Homebrew"
                  icon={Icon.Terminal}
                  onAction={() =>
                    runAppleScript(
                      `tell application "Terminal"\n  activate\n  do script "${BREW_INSTALL_COMMAND}"\nend tell`,
                    )
                  }
                />
              )}
              {!mpvPath && !brewPath && <Action.OpenInBrowser title="Open Homebrew Website" url="https://brew.sh" />}
              {!mpvPath && <Action.CopyToClipboard title="Copy Install Command" content={BREW_INSTALL_COMMAND} />}
              {commonActions}
            </ActionPanel>
          }
        />
        <List.Item
          title="4. Enter Printer Details"
          icon={config ? done : failed}
          detail={
            <List.Item.Detail
              markdown={
                config
                  ? "## Printer details saved ✅\n\nPress **↵** to change them."
                  : "## Enter printer details\n\nPress **↵** and type the IP address and access code from step 2. They're stored in Raycast's encrypted local storage and never leave your Mac."
              }
              metadata={
                config ? (
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.Label title="IP Address" text={config.ip} />
                    <List.Item.Detail.Metadata.Label title="Access Code" text="••••••••" />
                  </List.Item.Detail.Metadata>
                ) : undefined
              }
            />
          }
          actions={
            <ActionPanel>
              <Action
                title={config ? "Edit Printer Details" : "Enter Printer Details"}
                icon={Icon.Pencil}
                onAction={openForm}
              />
              {commonActions}
            </ActionPanel>
          }
        />
        <List.Item
          title="5. Test Connection"
          icon={testIcon}
          detail={
            <List.Item.Detail
              markdown={
                test.status === "running"
                  ? "## Testing…"
                  : testResult
                    ? `## ${testResult.ok ? "✅" : "❌"} ${testResult.title}\n\n${testResult.message}${
                        testResult.ok
                          ? ""
                          : `\n\n---\n\nYou can also check from Terminal:\n\n\`\`\`\nnc -zv ${config?.ip ?? "PRINTER_IP"} ${RTSPS_PORT}\n\`\`\``
                      }`
                    : `## Test the connection\n\nChecks that your Mac can reach the printer's camera port (${RTSPS_PORT}). Press **↵** to run the test.`
              }
            />
          }
          actions={
            <ActionPanel>
              <Action title="Test Connection" icon={Icon.Network} onAction={() => runTest()} />
              {commonActions}
            </ActionPanel>
          }
        />
      </List.Section>

      {ready && (
        <List.Section title="Done">
          <List.Item
            title="Open Live View"
            icon={{ source: Icon.Video, tintColor: testResult?.ok ? Color.Green : Color.SecondaryText }}
            detail={
              <List.Item.Detail
                markdown={`## Open the live view\n\nPress **↵** to open a small always-on-top camera window.\n\n- **Move it:** hold ⌘ and drag (the window has no title bar).\n- **Close it:** press **q** in the window, or run **Toggle Live View** again.\n- **Size & corner:** use the *Window Size & Position…* action (⌘K).\n\nTip: give **Toggle Live View** a hotkey in Raycast settings.`}
              />
            }
            actions={
              <ActionPanel>
                <Action title="Open Live View" icon={Icon.Video} onAction={openLiveView} />
                {commonActions}
              </ActionPanel>
            }
          />
        </List.Section>
      )}
    </List>
  );
}

interface FormValues {
  ip: string;
  accessCode: string;
}

function PrinterForm(props: { initial?: PrinterConfig; onSaved: (config: PrinterConfig) => Promise<void> }) {
  const { pop } = useNavigation();
  const { handleSubmit, itemProps } = useForm<FormValues>({
    initialValues: { ip: props.initial?.ip ?? "", accessCode: props.initial?.accessCode ?? "" },
    validation: {
      ip: validateIp,
      accessCode: validateAccessCode,
    },
    async onSubmit(values) {
      const config = { ip: values.ip.trim(), accessCode: values.accessCode.trim() };
      await saveConfig(config);
      await showToast({ style: Toast.Style.Success, title: "Printer details saved" });
      pop();
      await props.onSaved(config);
    },
  });

  return (
    <Form
      navigationTitle="Printer Details"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save and Test" icon={Icon.Check} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text="Find both on the printer: Settings → LAN Only." />
      <Form.TextField title="IP Address" placeholder="192.168.1.50" {...itemProps.ip} />
      <Form.PasswordField title="Access Code" placeholder="8 characters" {...itemProps.accessCode} />
      <Form.Description text="Stored in Raycast's encrypted local storage. Never shown or logged." />
    </Form>
  );
}
