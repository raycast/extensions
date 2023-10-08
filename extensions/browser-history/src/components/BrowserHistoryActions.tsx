import { Action, ActionPanel, getPreferenceValues, Icon, openCommandPreferences } from "@raycast/api";
import { openNewArcTab, openNewFirefoxTab, openNewTab } from "../actions";
import { HistoryEntry, Preferences, SupportedBrowsers } from "../interfaces";

export class BrowserHistoryActions {
  public static HistoryItem = HistoryItemAction;
  public static OpenPreferences = ActionOpenPreferences;
}

function HistoryItemAction({ entry: { url, browser } }: { entry: HistoryEntry }) {
  const { defaultBrowser } = getPreferenceValues<Preferences>();
  const actions = {
    [SupportedBrowsers.Chrome]: (
      <ActionPanel.Item
        title={"Open in Chrome"}
        icon={"chrome-logo.png"}
        shortcut={{ modifiers: ["cmd"], key: "c" }}
        onAction={() => openNewTab(SupportedBrowsers.Chrome, url)}
      />
    ),
    [SupportedBrowsers.Firefox]: (
      <ActionPanel.Item
        title={"Open in Firefox"}
        icon={"firefox-logo.png"}
        shortcut={{ modifiers: ["cmd"], key: "f" }}
        onAction={() => openNewFirefoxTab(url)}
      />
    ),
    [SupportedBrowsers.Safari]: (
      <ActionPanel.Item
        title={"Open in Safari"}
        icon={"safari-logo.png"}
        shortcut={{ modifiers: ["cmd"], key: "s" }}
        onAction={() => openNewTab(SupportedBrowsers.Safari, url)}
      />
    ),
    [SupportedBrowsers.Edge]: (
      <ActionPanel.Item
        title={"Open in Edge"}
        icon={"edge-logo.png"}
        shortcut={{ modifiers: ["cmd"], key: "e" }}
        onAction={() => openNewTab(SupportedBrowsers.Edge, url)}
      />
    ),
    [SupportedBrowsers.Brave]: (
      <ActionPanel.Item
        title={"Open in Brave"}
        icon={"brave-logo.png"}
        shortcut={{ modifiers: ["cmd"], key: "b" }}
        onAction={() => openNewTab(SupportedBrowsers.Brave, url)}
      />
    ),
    [SupportedBrowsers.Vivaldi]: (
      <ActionPanel.Item
        title={"Open in Vivaldi"}
        icon={"vivaldi-logo.png"}
        shortcut={{ modifiers: ["cmd"], key: "v" }}
        onAction={() => openNewTab(SupportedBrowsers.Vivaldi, url)}
      />
    ),
    [SupportedBrowsers.Arc]: (
      <ActionPanel.Item
        title={"Open in Arc"}
        icon={"arc-logo.svg"}
        shortcut={{ modifiers: ["cmd"], key: "a" }}
        onAction={() => openNewArcTab(url)}
      />
    ),
    [SupportedBrowsers.Opera]: (
      <ActionPanel.Item
        title={"Open in Opera"}
        icon={"opera-logo.png"}
        shortcut={{ modifiers: ["cmd"], key: "o" }}
        onAction={() => openNewTab(SupportedBrowsers.Opera, url)}
      />
    ),
    [SupportedBrowsers.Iridium]: (
      <ActionPanel.Item
        title={"Open in Iridium"}
        icon={"iridium-logo.png"}
        shortcut={{ modifiers: ["cmd"], key: "i" }}
        onAction={() => openNewTab(SupportedBrowsers.Iridium, url)}
      />
    ),
    [SupportedBrowsers.Orion]: (
      <ActionPanel.Item
        title={"Open in Orion"}
        icon={"orion-logo.png"}
        shortcut={{ modifiers: ["cmd"], key: "r" }}
        onAction={() => openNewTab(SupportedBrowsers.Orion, url)}
      />
    ),
  };
  return (
    <ActionPanel>
      {defaultBrowser && defaultBrowser !== "Default" ? (
        defaultBrowser == "Originator" ? (
          actions[browser]
        ) : (
          actions[defaultBrowser]
        )
      ) : (
        <Action.OpenInBrowser title="Open in Default Browser" url={url} />
      )}

      <ActionPanel.Section title={"Copy"}>
        <Action.CopyToClipboard title="Copy URL" content={url} shortcut={{ modifiers: ["cmd", "shift"], key: "c" }} />
      </ActionPanel.Section>
      <ActionPanel.Section title={"Open In"}>
        {actions[SupportedBrowsers.Chrome]}
        {actions[SupportedBrowsers.Firefox]}
        {actions[SupportedBrowsers.Safari]}
        {actions[SupportedBrowsers.Edge]}
        {actions[SupportedBrowsers.Brave]}
        {actions[SupportedBrowsers.Vivaldi]}
        {actions[SupportedBrowsers.Arc]}
        {actions[SupportedBrowsers.Opera]}
        {actions[SupportedBrowsers.Iridium]}
        {actions[SupportedBrowsers.Orion]}
      </ActionPanel.Section>
    </ActionPanel>
  );
}

function ActionOpenPreferences() {
  return (
    <ActionPanel.Section>
      <Action
        icon={Icon.Gear}
        title="Open Command Preferences"
        shortcut={{ modifiers: ["cmd"], key: "," }}
        onAction={openCommandPreferences}
      />
    </ActionPanel.Section>
  );
}
