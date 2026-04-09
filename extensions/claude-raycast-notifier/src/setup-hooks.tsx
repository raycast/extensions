import {
  Action,
  ActionPanel,
  Color,
  Icon,
  List,
  Toast,
  open,
  openCommandPreferences,
  showToast,
} from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { basename } from "node:path";
import {
  claudeSettingsPath,
  ensureSettingsFile,
  geminiSettingsPath,
  installAllHooks,
  installClaudeHooks,
  installGeminiHooks,
  loadHookSetupStatus,
  type HookProviderStatus,
} from "./lib/hook-setup";

export default function Command() {
  const { data, isLoading, revalidate } = usePromise(loadHookSetupStatus, []);

  return (
    <List isLoading={isLoading} navigationTitle="Setup Hooks">
      <List.Section title="Overview">
        <List.Item
          icon={{
            source: data?.runtimeInstalled ? Icon.CheckCircle : Icon.Warning,
            tintColor: data?.runtimeInstalled ? Color.Green : Color.Orange,
          }}
          title={
            data?.runtimeInstalled
              ? "Hook runtime is installed"
              : "Hook runtime is missing"
          }
          subtitle={data?.runtimeDir}
          actions={
            <ActionPanel>
              <Action
                title="Install All Hooks"
                icon={Icon.Download}
                onAction={async () => {
                  await installWithToast(
                    "Installing Claude and Gemini hooks",
                    async () => {
                      await installAllHooks();
                      await revalidate();
                      return "Claude and Gemini hooks are ready";
                    },
                  );
                }}
              />
              <Action
                title="Refresh"
                icon={Icon.ArrowClockwise}
                onAction={() => revalidate()}
              />
              <Action
                title="Open Preferences"
                icon={Icon.Gear}
                onAction={openCommandPreferences}
              />
            </ActionPanel>
          }
        />
      </List.Section>

      {data ? (
        <List.Section title="Providers">
          <ProviderItem
            status={data.claude}
            onInstall={async () => {
              await installWithToast("Installing Claude hooks", async () => {
                await installClaudeHooks();
                await revalidate();
                return "Claude hooks installed";
              });
            }}
          />
          <ProviderItem
            status={data.gemini}
            onInstall={async () => {
              await installWithToast("Installing Gemini hooks", async () => {
                await installGeminiHooks();
                await revalidate();
                return "Gemini hooks installed";
              });
            }}
          />
        </List.Section>
      ) : null}
    </List>
  );
}

function ProviderItem({
  status,
  onInstall,
}: {
  status: HookProviderStatus;
  onInstall: () => Promise<void>;
}) {
  const label = status.provider === "gemini" ? "Gemini" : "Claude";
  const tintColor = status.configured ? Color.Green : Color.Orange;
  const settingsPath =
    status.provider === "gemini" ? geminiSettingsPath() : claudeSettingsPath();

  return (
    <List.Item
      icon={{
        source: status.provider === "gemini" ? Icon.Stars : Icon.Terminal,
        tintColor,
      }}
      title={`${label} Hooks`}
      subtitle={status.configured ? "Configured" : "Needs setup"}
      accessories={[{ text: basename(settingsPath) }, { tag: label }]}
      detail={
        <List.Item.Detail
          markdown={[
            `# ${label} Hooks`,
            "",
            status.configured
              ? "_Hooks are installed and detected in the settings file._"
              : "_Hooks are not installed yet. Use the install action to create runtime files and update the settings file._",
            "",
            "## Settings File",
            "",
            `- ${settingsPath}`,
            "",
            "## Runtime Scripts",
            "",
            `- ${status.bridgePaths.eventBridge}`,
            `- ${status.bridgePaths.askBridge}`,
            ...(status.bridgePaths.afterAgentBridge
              ? [`- ${status.bridgePaths.afterAgentBridge}`]
              : []),
          ].join("\n")}
        />
      }
      actions={
        <ActionPanel>
          <Action
            title={`Install ${label} Hooks`}
            icon={Icon.Download}
            onAction={onInstall}
          />
          <Action
            title="Open Settings File"
            icon={Icon.Document}
            onAction={async () => {
              await ensureSettingsFile(settingsPath);
              await open(settingsPath);
            }}
          />
        </ActionPanel>
      }
    />
  );
}

async function installWithToast(title: string, action: () => Promise<string>) {
  await showToast({
    style: Toast.Style.Animated,
    title,
  });

  try {
    const message = await action();
    await showToast({
      style: Toast.Style.Success,
      title: message,
    });
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Hook setup failed",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
