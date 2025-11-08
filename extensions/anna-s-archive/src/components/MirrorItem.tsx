import { Action, ActionPanel, Color, Icon, List, openExtensionPreferences } from "@raycast/api";
import { useMirrorTest } from "@/hooks/use-mirror-test";

export const MirrorItem = ({
  mirror,
  selected,
  subtitle,
}: {
  mirror: string;
  selected: boolean;
  subtitle?: string;
}) => {
  const { isUp, isLoading, revalidate } = useMirrorTest(mirror);
  return (
    <List.Item
      title={mirror}
      subtitle={!isLoading && !isUp ? subtitle : undefined}
      icon={
        isLoading
          ? { source: Icon.Clock, tintColor: Color.SecondaryText }
          : isUp
            ? { source: Icon.Checkmark, tintColor: Color.Green }
            : { source: Icon.Xmark, tintColor: Color.Red }
      }
      accessories={
        selected ? [{ text: "Selected", icon: { source: Icon.Checkmark, tintColor: Color.Green } }] : undefined
      }
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Mirror">
            <Action title="Refresh" onAction={() => revalidate()} icon={Icon.ArrowClockwise} />
            <Action.OpenInBrowser title="Open in Browser" url={mirror} icon={Icon.Globe} />
          </ActionPanel.Section>
          <ActionPanel.Section title="Other">
            <Action title="Open Extension Preferences" onAction={openExtensionPreferences} icon={Icon.Gear} />
            <Action.OpenInBrowser title="Check Mirror Statuses" url="https://open-slum.pages.dev/" icon={Icon.Globe} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
};
