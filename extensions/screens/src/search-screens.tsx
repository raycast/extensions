import {
  Action,
  ActionPanel,
  Color,
  Icon,
  Keyboard,
  List,
  closeMainWindow,
  getPreferenceValues,
  open,
  openExtensionPreferences,
} from '@raycast/api';
import { showFailureToast, useCachedPromise } from '@raycast/utils';
import { useMemo } from 'react';
import { Screen, ScreenType, archiveModifiedAt, readArchive } from './archive';
import { ConnectOptions, connectUrl, directUrl, normalizeHostname } from './connect';
import ArchiveErrorView from './components/ArchiveErrorView';

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
  const { archivePath } = getPreferenceValues<Preferences.SearchScreens>();
  const modifiedAt = archiveModifiedAt(archivePath);

  const { data, isLoading, error, revalidate } = useCachedPromise(readArchive, [archivePath, modifiedAt]);

  const screens = useMemo(() => data?.screens ?? [], [data]);
  const sections = useMemo(() => groupByType(screens), [screens]);

  if (error) {
    return <ArchiveErrorView error={error} onRetry={revalidate} />;
  }

  return (
    <List isLoading={isLoading} navigationTitle={data ? `Archive from ${formatDate(data.exportedAt)}` : 'Screens'}>
      <List.EmptyView
        icon={Icon.Desktop}
        title="No Screens in This Archive"
        description="Export an archive from Screens → Settings → Archives → Export…, then select it in preferences."
        actions={
          <ActionPanel>
            <Action title="Open Extension Preferences" onAction={openExtensionPreferences} />
            <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={revalidate} />
          </ActionPanel>
        }
      />
      {sections.map((section) => (
        <List.Section key={section.title} title={section.title} subtitle={`${section.screens.length}`}>
          {section.screens.map((screen) => (
            <ScreenItem key={screen.id} screen={screen} all={screens} onRefresh={revalidate} />
          ))}
        </List.Section>
      ))}
    </List>
  );
}

function ScreenItem({ screen, all, onRefresh }: { screen: Screen; all: Screen[]; onRefresh: () => void }) {
  const target = connectUrl(screen, all);
  const address = directUrl(screen);

  return (
    <List.Item
      icon={TYPE_ICONS[screen.type]}
      title={screen.name || normalizeHostname(screen.hostname)}
      subtitle={normalizeHostname(screen.hostname)}
      keywords={[screen.username, screen.publicIpAddress].filter((keyword): keyword is string => Boolean(keyword))}
      accessories={buildAccessories(screen, target.viaSavedScreen, target.ambiguous)}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action title="Connect" icon={Icon.Desktop} onAction={() => connect(screen, all)} />
            <Action
              title="Connect in Observe Mode"
              icon={Icon.Eye}
              shortcut={{ modifiers: ['cmd', 'shift'], key: 'e' }}
              onAction={() => connect(screen, all, { observe: true })}
            />
            <Action
              title="Connect as Guest"
              icon={Icon.Person}
              shortcut={{ modifiers: ['cmd', 'shift'], key: 'g' }}
              onAction={() => connect(screen, all, { guest: true })}
            />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action.CopyToClipboard
              title="Copy Hostname"
              content={normalizeHostname(screen.hostname)}
              shortcut={Keyboard.Shortcut.Common.Copy}
            />
            {address ? (
              <Action.CopyToClipboard
                title="Copy Address"
                content={address}
                shortcut={Keyboard.Shortcut.Common.CopyPath}
              />
            ) : null}
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action.Open title="Open Screens" target="/Applications/Screens 5.app" icon={Icon.AppWindow} />
            <Action
              title="Refresh"
              icon={Icon.ArrowClockwise}
              shortcut={Keyboard.Shortcut.Common.Refresh}
              onAction={onRefresh}
            />
            <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

async function connect(screen: Screen, all: Screen[], options?: ConnectOptions) {
  const { url } = connectUrl(screen, all, options);
  try {
    await open(url);
    await closeMainWindow();
  } catch (error) {
    await showFailureToast(error, { title: `Could not connect to ${screen.name || screen.hostname}` });
  }
}

function buildAccessories(screen: Screen, viaSavedScreen: boolean, ambiguous: boolean): List.Item.Accessory[] {
  const accessories: List.Item.Accessory[] = [];

  if (ambiguous) {
    accessories.push({
      icon: { source: Icon.ExclamationMark, tintColor: Color.Orange },
      tooltip: 'Another screen shares this name, so Screens decides which one opens.',
    });
  } else if (!viaSavedScreen) {
    accessories.push({
      icon: { source: Icon.ArrowRight, tintColor: Color.SecondaryText },
      tooltip: 'Connects to this host directly rather than through the saved screen.',
    });
  }

  accessories.push({ tag: screen.clientProtocol.toUpperCase() });

  if (screen.lastConnectionDate) {
    accessories.push({
      date: screen.lastConnectionDate,
      tooltip: `Last connected ${formatDate(screen.lastConnectionDate)}`,
    });
  }

  return accessories;
}

function groupByType(screens: Screen[]): { title: string; screens: Screen[] }[] {
  return SECTIONS.map((section) => ({
    title: section.title,
    screens: screens.filter((screen) => section.types.includes(screen.type)).sort(byRecency),
  })).filter((section) => section.screens.length > 0);
}

function byRecency(a: Screen, b: Screen): number {
  const difference = (b.lastConnectionDate?.getTime() ?? 0) - (a.lastConnectionDate?.getTime() ?? 0);
  return difference !== 0 ? difference : b.numberOfConnections - a.numberOfConnections;
}

function formatDate(date: Date): string {
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}
