import { t } from "./i18n";
import { Action, ActionPanel, Icon } from "@raycast/api";

export type ProviderMenuItem = {
  id: string;
  title: string;
  description: string;
};

export type ProviderMenuProps = {
  providers: ProviderMenuItem[];
  selected: string;
  onSelect: (id: string) => void;
  shortcuts?: boolean;
};

export function ProviderMenu({
  providers,
  selected,
  onSelect,
  shortcuts = true,
}: ProviderMenuProps) {
  if (!providers.length) return null;

  const current = providers.find((provider) => provider.id === selected);

  return (
    <ActionPanel.Submenu
      title={
        current
          ? t("Provider: {provider}", { provider: current.title })
          : t("Choose Provider")
      }
      icon={
        current
          ? `provider-${current.id === "qoder-cn" ? "qoder" : current.id}.png`
          : Icon.Terminal
      }
      shortcut={
        shortcuts
          ? {
              modifiers: [process.platform === "darwin" ? "cmd" : "ctrl"],
              key: "p",
            }
          : undefined
      }
    >
      <ActionPanel.Section title={t("Local AI CLI")}>
        {providers.map((provider) => (
          <Action
            key={provider.id}
            title={provider.title}
            icon={`provider-${provider.id === "qoder-cn" ? "qoder" : provider.id}.png`}
            autoFocus={provider.id === selected}
            onAction={() => {
              // Re-selecting the active CLI must not reset its conversation.
              if (provider.id !== selected) onSelect(provider.id);
            }}
          />
        ))}
      </ActionPanel.Section>
    </ActionPanel.Submenu>
  );
}
