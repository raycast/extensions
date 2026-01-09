import { Action, ActionPanel, Detail, Icon, showToast, Toast } from "@raycast/api";
import { useLocalStorage, usePromise } from "@raycast/utils";
import { BLUETOOTH_DEPENDENCY, checkBluetoothDependency, checkCoreDependencies, type Dependency } from "./exec";

const SETUP_COMPLETE_KEY = "setup-complete";

// Check core dependencies (SwitchAudioSource) on startup
export function useDependencyCheck() {
  const {
    value: setupComplete,
    setValue: setSetupComplete,
    isLoading: loadingStorage,
  } = useLocalStorage<boolean>(SETUP_COMPLETE_KEY, false);

  const {
    data: missing,
    isLoading: checking,
    revalidate,
  } = usePromise(
    async (shouldCheck: boolean) => {
      // Skip check if setup already marked complete
      if (shouldCheck) {
        return [];
      }
      const result = await checkCoreDependencies();
      // If all deps found, mark setup complete
      if (result.length === 0) {
        await setSetupComplete(true);
      }
      return result;
    },
    [setupComplete === true],
    { execute: !loadingStorage },
  );

  return {
    data: missing ?? [],
    isLoading: loadingStorage || checking,
    revalidate: async () => {
      // Clear the flag to force re-check
      await setSetupComplete(false);
      revalidate();
    },
  };
}

// Check Bluetooth dependency on-demand (when user tries to use BT features)
// Returns true if available, false if not (and shows toast with instructions)
let bluetoothChecked = false;
let bluetoothAvailable = false;

export async function requireBluetooth(): Promise<boolean> {
  // Cache the result to avoid repeated checks
  if (bluetoothChecked) {
    if (!bluetoothAvailable) {
      await showBluetoothMissingToast();
    }
    return bluetoothAvailable;
  }

  bluetoothChecked = true;
  bluetoothAvailable = await checkBluetoothDependency();

  if (!bluetoothAvailable) {
    await showBluetoothMissingToast();
  }

  return bluetoothAvailable;
}

async function showBluetoothMissingToast() {
  await showToast({
    style: Toast.Style.Failure,
    title: "blueutil required for Bluetooth",
    message: `Run: brew install ${BLUETOOTH_DEPENDENCY.brewPackage}`,
    primaryAction: {
      title: "Copy Install Command",
      onAction: async (toast) => {
        const { Clipboard } = await import("@raycast/api");
        await Clipboard.copy(`brew install ${BLUETOOTH_DEPENDENCY.brewPackage}`);
        toast.hide();
      },
    },
  });
}

export function MissingDependenciesView(props: { missing: Dependency[]; onRecheck: () => void }) {
  const brewCommand = `brew install ${props.missing.map((d) => d.brewPackage).join(" ")}`;

  const markdown = `
# Setup Required

This extension requires a command-line tool to manage audio output.

---

### Missing Tools

${props.missing.map((d) => `- **${d.name}**`).join("\n")}

---

### Installation

Install via [Homebrew](https://brew.sh):

\`\`\`bash
${brewCommand}
\`\`\`

No Homebrew? Install it first:

\`\`\`bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
\`\`\`

---

After installing, press Enter to re-check.
`;

  return (
    <Detail
      actions={
        <ActionPanel>
          <Action icon={Icon.ArrowClockwise} onAction={props.onRecheck} title="Re-Check Dependencies" />
          <Action.CopyToClipboard content={brewCommand} title="Copy Install Command" />
          <Action.OpenInBrowser title="Open Homebrew Website" url="https://brew.sh" />
        </ActionPanel>
      }
      markdown={markdown}
    />
  );
}
