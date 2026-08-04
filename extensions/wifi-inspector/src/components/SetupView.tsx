import { Action, ActionPanel, Detail, Icon, open } from "@raycast/api";

interface SetupViewProps {
  title: string;
  markdown: string;
  isLoading?: boolean;
  onRetry?: () => void;
  onForceDownload?: () => void;
}

export function SetupView({ title, markdown, isLoading, onRetry, onForceDownload }: SetupViewProps) {
  return (
    <Detail
      isLoading={isLoading}
      navigationTitle={title}
      markdown={markdown}
      actions={
        <ActionPanel>
          {onRetry ? <Action title="Retry" icon={Icon.ArrowClockwise} onAction={onRetry} /> : null}
          {onForceDownload ? <Action title="Re-Download CLI" icon={Icon.Download} onAction={onForceDownload} /> : null}
          <Action
            title="Open Location Services Settings"
            icon={Icon.Gear}
            onAction={() => open("x-apple.systempreferences:com.apple.preference.security?Privacy_Location")}
          />
          <Action
            title="Open Macwifi-Cli Releases"
            icon={Icon.Globe}
            onAction={() => open("https://github.com/jaisonerick/macwifi-cli/releases")}
          />
          <Action
            title="Open Macwifi-Cli on GitHub"
            icon={Icon.Link}
            onAction={() => open("https://github.com/jaisonerick/macwifi-cli")}
          />
        </ActionPanel>
      }
    />
  );
}
