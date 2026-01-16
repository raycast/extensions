import { useState, useEffect, useCallback } from "react";
import {
  Detail,
  ActionPanel,
  Action,
  Icon,
  showToast,
  Toast,
  openExtensionPreferences,
  Clipboard,
  List,
  Form,
  environment,
} from "@raycast/api";
import path from "path";
import { discoverBridges, authenticate, isLinkButtonError, getApplicationKey } from "./api/auth";
import type { BridgeDiscovery } from "./api/generated/src/models";

type SetupState =
  | { step: "discovering" }
  | { step: "select-bridge"; bridges: BridgeDiscovery[] }
  | { step: "no-bridges" }
  | { step: "manual-entry" }
  | { step: "waiting-for-button"; bridgeIP: string }
  | { step: "success"; bridgeIP: string; applicationKey: string }
  | { step: "error"; message: string };

export default function SetupCommand() {
  const [state, setState] = useState<SetupState>({ step: "discovering" });

  useEffect(() => {
    discoverBridgesAsync();
  }, []);

  const discoverBridgesAsync = async () => {
    setState({ step: "discovering" });

    try {
      const bridges = await discoverBridges();

      if (bridges.length === 0) {
        setState({ step: "no-bridges" });
      } else if (bridges.length === 1) {
        // Auto-select single bridge
        startAuthentication(bridges[0].internalipaddress);
      } else {
        setState({ step: "select-bridge", bridges });
      }
    } catch (error) {
      setState({
        step: "error",
        message: error instanceof Error ? error.message : "Failed to discover bridges",
      });
    }
  };

  const startAuthentication = useCallback((bridgeIP: string) => {
    setState({ step: "waiting-for-button", bridgeIP });
    pollForAuthentication(bridgeIP);
  }, []);

  const pollForAuthentication = async (bridgeIP: string) => {
    const maxAttempts = 30; // 30 seconds
    let attempts = 0;
    let lastError: string | null = null;

    while (attempts < maxAttempts) {
      try {
        const response = await authenticate(bridgeIP);

        if (isLinkButtonError(response)) {
          // Button not pressed yet, wait and retry
          await new Promise((resolve) => setTimeout(resolve, 1000));
          attempts++;
          continue;
        }

        const applicationKey = getApplicationKey(response);
        if (applicationKey) {
          setState({ step: "success", bridgeIP, applicationKey });
          await showToast({
            style: Toast.Style.Success,
            title: "Successfully connected to Hue Bridge!",
          });
          return;
        }

        // Some other API error (not link button)
        setState({
          step: "error",
          message: response.error?.description ?? "Unknown error during authentication",
        });
        return;
      } catch (error) {
        // Network/connection errors - keep trying, user might still press the button
        lastError = error instanceof Error ? error.message : "Connection failed";
        await new Promise((resolve) => setTimeout(resolve, 1000));
        attempts++;
        continue;
      }
    }

    setState({
      step: "error",
      message: lastError
        ? `Connection issue: ${lastError}. Make sure the bridge IP is correct and you're on the same network.`
        : "Timeout: Please press the link button on your Hue Bridge and try again.",
    });
  };

  switch (state.step) {
    case "discovering":
      return <DiscoveringView />;

    case "no-bridges":
      return <NoBridgesView onRetry={discoverBridgesAsync} onManualEntry={() => setState({ step: "manual-entry" })} />;

    case "manual-entry":
      return <ManualEntryView onSubmit={startAuthentication} onBack={discoverBridgesAsync} />;

    case "select-bridge":
      return <SelectBridgeView bridges={state.bridges} onSelect={startAuthentication} onRetry={discoverBridgesAsync} />;

    case "waiting-for-button":
      return <WaitingForButtonView bridgeIP={state.bridgeIP} onCancel={discoverBridgesAsync} />;

    case "success":
      return <SuccessView bridgeIP={state.bridgeIP} applicationKey={state.applicationKey} />;

    case "error":
      return (
        <ErrorView
          message={state.message}
          onRetry={discoverBridgesAsync}
          onManualEntry={() => setState({ step: "manual-entry" })}
        />
      );
  }
}

function DiscoveringView() {
  return (
    <Detail
      isLoading={true}
      markdown={`# Discovering Hue Bridges...

Searching for Philips Hue Bridges on your network.

This may take a few seconds.`}
    />
  );
}

function NoBridgesView({ onRetry, onManualEntry }: { onRetry: () => void; onManualEntry: () => void }) {
  return (
    <Detail
      markdown={`# No Hue Bridges Found

Could not find any Philips Hue Bridges on your network.

**Please check that:**
- Your Hue Bridge is powered on
- Your Hue Bridge is connected to your network
- Your computer is on the same network as the Bridge

You can manually enter the Bridge IP address if you know it.`}
      actions={
        <ActionPanel>
          <Action title="Enter IP Manually" icon={Icon.Pencil} onAction={onManualEntry} />
          <Action title="Retry Discovery" icon={Icon.ArrowClockwise} onAction={onRetry} />
          <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
        </ActionPanel>
      }
    />
  );
}

function ManualEntryView({ onSubmit, onBack }: { onSubmit: (ip: string) => void; onBack: () => void }) {
  const [ip, setIp] = useState("");

  const handleSubmit = () => {
    const trimmedIp = ip.trim();
    if (!trimmedIp) {
      showToast({
        style: Toast.Style.Failure,
        title: "Please enter an IP address",
      });
      return;
    }
    onSubmit(trimmedIp);
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Connect" icon={Icon.Link} onSubmit={handleSubmit} />
          <Action title="Back to Discovery" icon={Icon.ArrowLeft} onAction={onBack} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="bridgeIP"
        title="Bridge IP Address"
        placeholder="e.g., 192.168.1.100"
        value={ip}
        onChange={setIp}
        info="Enter the IP address of your Philips Hue Bridge. You can find this in your router's admin panel or the Hue app."
      />
      <Form.Description
        title="How to Find Your Bridge IP"
        text="1. Open the Philips Hue app on your phone\n2. Go to Settings → Hue Bridges\n3. Tap the (i) icon next to your bridge\n4. The IP address will be listed there"
      />
    </Form>
  );
}

function SelectBridgeView({
  bridges,
  onSelect,
  onRetry,
}: {
  bridges: BridgeDiscovery[];
  onSelect: (ip: string) => void;
  onRetry: () => void;
}) {
  return (
    <List>
      <List.Section title="Select a Hue Bridge" subtitle={`${bridges.length} bridges found`}>
        {bridges.map((bridge) => (
          <List.Item
            key={bridge.id}
            icon={Icon.Network}
            title={bridge.internalipaddress}
            subtitle={bridge.id}
            actions={
              <ActionPanel>
                <Action
                  title="Connect to This Bridge"
                  icon={Icon.Link}
                  onAction={() => onSelect(bridge.internalipaddress)}
                />
                <Action title="Retry Discovery" icon={Icon.ArrowClockwise} onAction={onRetry} />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}

function WaitingForButtonView({ bridgeIP, onCancel }: { bridgeIP: string; onCancel: () => void }) {
  const waitingIcon = path.join(environment.assetsPath, "connect-waiting.png");

  return (
    <Detail
      markdown={`# Press the Link Button

![Waiting](${waitingIcon})

**Please press the large button on top of your Hue Bridge** to authorize this extension.

Connecting to: **${bridgeIP}**

Waiting for button press...`}
      actions={
        <ActionPanel>
          <Action title="Cancel" icon={Icon.XMarkCircle} onAction={onCancel} />
        </ActionPanel>
      }
    />
  );
}

function SuccessView({ bridgeIP, applicationKey }: { bridgeIP: string; applicationKey: string }) {
  const successIcon = path.join(environment.assetsPath, "connect-ok.png");

  const handleCopyCredentials = async () => {
    await Clipboard.copy(`Bridge IP: ${bridgeIP}\nApplication Key: ${applicationKey}`);
    await showToast({
      style: Toast.Style.Success,
      title: "Credentials copied to clipboard",
    });
  };

  return (
    <Detail
      markdown={`# Successfully Connected! 🎉

![Success](${successIcon})

Your Hue Bridge has been successfully connected.

**Bridge IP:** \`${bridgeIP}\`

**Application Key:** \`${applicationKey}\`

---

## Next Steps

1. **Copy the credentials** using the action below
2. **Open Extension Preferences** and paste the values
3. Start using the extension to control your lights!

> **Important:** Save your Application Key securely. You will need it if you reinstall the extension.`}
      actions={
        <ActionPanel>
          <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
          <Action
            title="Copy Credentials"
            icon={Icon.Clipboard}
            shortcut={{ modifiers: ["cmd"], key: "c" }}
            onAction={handleCopyCredentials}
          />
          <Action title="Copy Bridge IP" icon={Icon.Clipboard} onAction={() => Clipboard.copy(bridgeIP)} />
          <Action title="Copy Application Key" icon={Icon.Clipboard} onAction={() => Clipboard.copy(applicationKey)} />
        </ActionPanel>
      }
    />
  );
}

function ErrorView({
  message,
  onRetry,
  onManualEntry,
}: {
  message: string;
  onRetry: () => void;
  onManualEntry: () => void;
}) {
  const errorIcon = path.join(environment.assetsPath, "connect-ko.png");

  return (
    <Detail
      markdown={`# Error

![Error](${errorIcon})

Something went wrong during setup:

> ${message}

Please try again, enter the IP manually, or check your network connection.`}
      actions={
        <ActionPanel>
          <Action title="Enter IP Manually" icon={Icon.Pencil} onAction={onManualEntry} />
          <Action title="Retry" icon={Icon.ArrowClockwise} onAction={onRetry} />
          <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
        </ActionPanel>
      }
    />
  );
}
