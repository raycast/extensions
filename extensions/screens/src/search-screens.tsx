import {
  Action,
  ActionPanel,
  Alert,
  Color,
  Icon,
  Keyboard,
  LaunchType,
  List,
  Toast,
  closeMainWindow,
  confirmAlert,
  launchCommand,
  open,
  showToast,
} from '@raycast/api';
import { showFailureToast } from '@raycast/utils';
import { useMemo } from 'react';
import { ScreenType } from './archive';
import { ConnectOptions, describeTarget, normalizeHostname, targetUrl } from './connect';
import { ImportedScreen, importedScreenTitle, useImportedScreens } from './library';

const SECTIONS: { title: string; types: ScreenType[] }[] = [
  { title: 'Local Network', types: ['local'] },
  { title: 'Tailscale', types: ['tailscale'] },
  { title: 'Remote', types: ['remote'] },
  { title: 'Other', types: ['url', 'saved', 'recent'] },
];

const TYPE_ICONS: Record<ScreenType, Icon> = {
  local: Icon.Desktop,
  tailscale: Icon.Network,
  remote: Icon.Globe,
  url: Icon.Link,
  saved: Icon.Desktop,
  recent: Icon.Clock,
};

export default function Command() {
  const { screens, setScreens, isLoading } = useImportedScreens();
  const sections = useMemo(() => groupByType(screens), [screens]);

  async function remove(screen: ImportedScreen) {
    const confirmed = await confirmAlert({
      title: `Remove ${importedScreenTitle(screen)}?`,
      message: 'This only removes it from Raycast. The screen stays in Screens.',
      primaryAction: { title: 'Remove', style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) return;

    await setScreens(screens.filter((other) => other.id !== screen.id));
    await showToast({ style: Toast.Style.Success, title: `Removed ${importedScreenTitle(screen)}` });
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search screens">
      <List.EmptyView
        icon={Icon.Desktop}
        title="No Screens Imported"
        description="Import an archive exported from Screens, then pick the screens worth keeping."
        actions={
          <ActionPanel>
            <ImportAction />
          </ActionPanel>
        }
      />
      {sections.map((section) => (
        <List.Section key={section.title} title={section.title} subtitle={`${section.screens.length}`}>
          {section.screens.map((screen) => (
            <List.Item
              key={screen.id}
              icon={TYPE_ICONS[screen.type]}
              title={importedScreenTitle(screen)}
              subtitle={describeTarget(screen.target)}
              keywords={[normalizeHostname(screen.hostname), screen.name]}
              accessories={buildAccessories(screen)}
              actions={
                <ActionPanel>
                  <ActionPanel.Section>
                    <Action title="Connect" icon={Icon.Desktop} onAction={() => connect(screen)} />
                    <Action
                      title="Connect in Observe Mode"
                      icon={Icon.Eye}
                      shortcut={{ modifiers: ['cmd', 'shift'], key: 'e' }}
                      onAction={() => connect(screen, { observe: true })}
                    />
                    <Action
                      title="Connect as Guest"
                      icon={Icon.Person}
                      shortcut={{ modifiers: ['cmd', 'shift'], key: 'g' }}
                      onAction={() => connect(screen, { guest: true })}
                    />
                  </ActionPanel.Section>
                  <ActionPanel.Section>
                    <Action.CopyToClipboard
                      title="Copy Hostname"
                      content={normalizeHostname(screen.hostname)}
                      shortcut={Keyboard.Shortcut.Common.Copy}
                    />
                    <Action.CopyToClipboard
                      title="Copy Connect URL"
                      content={targetUrl(screen.target)}
                      shortcut={Keyboard.Shortcut.Common.CopyPath}
                    />
                  </ActionPanel.Section>
                  <ActionPanel.Section>
                    <ImportAction />
                    <Action
                      title="Remove from Raycast"
                      icon={Icon.Trash}
                      style={Action.Style.Destructive}
                      shortcut={Keyboard.Shortcut.Common.Remove}
                      onAction={() => remove(screen)}
                    />
                    <Action.Open title="Open Screens" target="/Applications/Screens 5.app" icon={Icon.AppWindow} />
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ))}
    </List>
  );
}

function ImportAction() {
  return (
    <Action
      title="Import Screens…"
      icon={Icon.Download}
      shortcut={{ modifiers: ['cmd'], key: 'i' }}
      onAction={() => launchCommand({ name: 'import-screens', type: LaunchType.UserInitiated })}
    />
  );
}

async function connect(screen: ImportedScreen, options?: ConnectOptions) {
  try {
    await open(targetUrl(screen.target, options));
    await closeMainWindow();
  } catch (error) {
    await showFailureToast(error, { title: `Could not connect to ${importedScreenTitle(screen)}` });
  }
}

function buildAccessories(screen: ImportedScreen): List.Item.Accessory[] {
  const accessories: List.Item.Accessory[] = [];

  if (screen.target.kind === 'saved' && screen.target.ambiguous) {
    accessories.push({
      icon: { source: Icon.ExclamationMark, tintColor: Color.Orange },
      tooltip: 'Another screen shares this name, so Screens decides which one opens.',
    });
  } else if (screen.target.kind === 'direct') {
    accessories.push({
      icon: { source: Icon.ArrowRight, tintColor: Color.SecondaryText },
      tooltip: 'Connects to this host directly rather than through the saved screen.',
    });
  }

  accessories.push({ tag: screen.clientProtocol.toUpperCase() });

  const lastConnected = screen.lastConnectionDate ? new Date(screen.lastConnectionDate) : undefined;
  if (lastConnected) {
    accessories.push({ date: lastConnected, tooltip: 'Last connected, according to the archive' });
  }

  return accessories;
}

function groupByType(screens: ImportedScreen[]): { title: string; screens: ImportedScreen[] }[] {
  return SECTIONS.map((section) => ({
    title: section.title,
    screens: screens.filter((screen) => section.types.includes(screen.type)).sort(byRecency),
  })).filter((section) => section.screens.length > 0);
}

function byRecency(a: ImportedScreen, b: ImportedScreen): number {
  const difference = timestamp(b) - timestamp(a);
  return difference !== 0 ? difference : b.numberOfConnections - a.numberOfConnections;
}

function timestamp(screen: ImportedScreen): number {
  return screen.lastConnectionDate ? new Date(screen.lastConnectionDate).getTime() : 0;
}
