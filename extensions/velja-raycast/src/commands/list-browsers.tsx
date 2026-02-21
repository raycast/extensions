import { Action, ActionPanel, Clipboard, Icon, List, Toast, showToast } from "@raycast/api";
import { getBrowserIcon, getBrowserSubtitle, getBrowserTitle } from "../lib/browsers";
import { setAlternativeBrowserViaShortcut, setDefaultBrowserViaShortcut } from "../lib/shortcuts";
import { readVeljaConfig } from "../lib/velja";

function BrowserActions(props: { identifier: string }) {
  const { identifier } = props;

  async function handleSetDefault() {
    await showToast({ style: Toast.Style.Animated, title: "Updating default browser..." });

    try {
      setDefaultBrowserViaShortcut(identifier);
      await showToast({ style: Toast.Style.Success, title: "Updated default browser" });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Could not update default browser",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async function handleSetAlternative() {
    await showToast({ style: Toast.Style.Animated, title: "Updating alternative browser..." });

    try {
      setAlternativeBrowserViaShortcut(identifier);
      await showToast({ style: Toast.Style.Success, title: "Updated alternative browser" });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Could not update alternative browser",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return (
    <ActionPanel>
      <Action title="Set as Default Browser" icon={Icon.CheckCircle} onAction={handleSetDefault} />
      <Action title="Set as Alternative Browser" icon={Icon.ArrowNe} onAction={handleSetAlternative} />
      <Action
        title="Copy Identifier"
        icon={Icon.Clipboard}
        onAction={async () => {
          await Clipboard.copy(identifier);
          await showToast({ style: Toast.Style.Success, title: "Copied browser identifier" });
        }}
      />
    </ActionPanel>
  );
}

export default function Command() {
  const config = readVeljaConfig();
  const defaultBrowser = config.defaultBrowser;
  const alternativeBrowser = config.alternativeBrowser;
  const preferredBrowsers = [...config.preferredBrowsers];
  const additionalConfiguredBrowsers = [defaultBrowser, alternativeBrowser].reduce<string[]>((result, identifier) => {
    if (!identifier || preferredBrowsers.includes(identifier) || result.includes(identifier)) {
      return result;
    }

    result.push(identifier);
    return result;
  }, []);

  function renderBrowserItem(identifier: string) {
    const accessories: List.Item.Accessory[] = [];

    if (identifier === defaultBrowser) {
      accessories.push({ tag: "Default" });
    }

    if (identifier === alternativeBrowser) {
      accessories.push({ tag: "Alternative" });
    }

    return (
      <List.Item
        key={identifier}
        title={getBrowserTitle(identifier)}
        subtitle={getBrowserSubtitle(identifier)}
        accessories={accessories}
        icon={getBrowserIcon(identifier)}
        actions={<BrowserActions identifier={identifier} />}
      />
    );
  }

  return (
    <List searchBarPlaceholder="Search Velja browsers and profiles...">
      <List.Section title="Shown Browsers (Velja Order)">
        {preferredBrowsers.map((identifier) => renderBrowserItem(identifier))}
      </List.Section>
      {additionalConfiguredBrowsers.length > 0 ? (
        <List.Section title="Configured but Not in Shown Browsers">
          {additionalConfiguredBrowsers.map((identifier) => renderBrowserItem(identifier))}
        </List.Section>
      ) : null}
    </List>
  );
}
