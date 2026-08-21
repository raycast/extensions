import {
  Action,
  ActionPanel,
  Alert,
  Icon,
  Image,
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
import { showFailureToast, useFrecencySorting } from '@raycast/utils';
import { useMemo, useState } from 'react';
import { ClientProtocol } from './archive';
import { ALL_TYPES, connectionAccessories, groupByType, occupiedSections, targetStatus } from './connection-type';
import { ConnectOptions, describeTarget, targetUrl } from './connect';
import { SavedConnection, blankConnection, useSavedConnections } from './library';
import ConnectionForm from './components/ConnectionForm';
import TypeFilter from './components/TypeFilter';

const PROTOCOL_ICONS: Record<ClientProtocol, Image.ImageLike> = {
  vnc: Icon.Monitor,
  rdp: Icon.Window,
};

export default function Command() {
  const { connections, setConnections, isLoading } = useSavedConnections();
  const [filter, setFilter] = useState(ALL_TYPES);

  // Ordered by how often and how recently the user actually connects, which is the only usage
  // record that stays true. What Screens counted belongs to the archive it was exported from.
  const { data: ranked, visitItem, resetRanking } = useFrecencySorting(connections);

  const sections = useMemo(() => groupByType(ranked, filter), [ranked, filter]);
  const availableSections = useMemo(() => occupiedSections(connections), [connections]);

  async function save(updated: SavedConnection) {
    const existing = connections.some((entry) => entry.id === updated.id);
    await setConnections(
      existing ? connections.map((entry) => (entry.id === updated.id ? updated : entry)) : [...connections, updated],
    );
    await showToast({
      style: Toast.Style.Success,
      title: existing ? `Updated ${updated.name}` : `Added ${updated.name}`,
    });
  }

  async function remove(connection: SavedConnection) {
    const confirmed = await confirmAlert({
      title: `Remove ${connection.name}?`,
      message: 'This only removes it from Raycast. The connection stays in Screens.',
      primaryAction: { title: 'Remove', style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) return;

    await setConnections(connections.filter((entry) => entry.id !== connection.id));
    await resetRanking(connection);
    await showToast({ style: Toast.Style.Success, title: `Removed ${connection.name}` });
  }

  async function connect(connection: SavedConnection, options?: ConnectOptions) {
    try {
      await open(targetUrl(connection.target, options));
      await visitItem(connection);
      await closeMainWindow();
    } catch (error) {
      await showFailureToast(error, { title: `Could not connect to ${connection.name}` });
    }
  }

  const addAction = <AddAction onSave={save} />;

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search connections"
      searchBarAccessory={<TypeFilter sections={availableSections} value={filter} onChange={setFilter} />}
    >
      <List.EmptyView
        icon={Icon.Desktop}
        title="No Connections Yet"
        description="Import an archive exported from Screens, or add a connection by hand."
        actions={
          <ActionPanel>
            <ImportAction />
            {addAction}
          </ActionPanel>
        }
      />
      {sections.map((section) => (
        <List.Section key={section.title} title={section.title} subtitle={`${section.connections.length}`}>
          {section.connections.map((connection) => (
            <List.Item
              key={connection.id}
              icon={{
                value: PROTOCOL_ICONS[connection.clientProtocol],
                tooltip: connection.clientProtocol.toUpperCase(),
              }}
              title={connection.name}
              subtitle={describeTarget(connection.target)}
              accessories={connectionAccessories(connection.type, targetStatus(connection.target))}
              actions={
                <ActionPanel>
                  <ActionPanel.Section>
                    <Action title="Connect" icon={Icon.Desktop} onAction={() => connect(connection)} />
                    <Action
                      title="Connect in Observe Mode"
                      icon={Icon.Eye}
                      shortcut={{ modifiers: ['cmd', 'shift'], key: 'e' }}
                      onAction={() => connect(connection, { observe: true })}
                    />
                    <Action
                      title="Connect as Guest"
                      icon={Icon.Person}
                      shortcut={{ modifiers: ['cmd', 'shift'], key: 'g' }}
                      onAction={() => connect(connection, { guest: true })}
                    />
                  </ActionPanel.Section>
                  <ActionPanel.Section>
                    <Action.Push
                      title="Edit Connection"
                      icon={Icon.Pencil}
                      shortcut={Keyboard.Shortcut.Common.Edit}
                      target={<ConnectionForm connection={connection} onSave={save} />}
                    />
                    {addAction}
                    <Action
                      title="Remove from Raycast"
                      icon={Icon.Trash}
                      style={Action.Style.Destructive}
                      shortcut={Keyboard.Shortcut.Common.Remove}
                      onAction={() => remove(connection)}
                    />
                  </ActionPanel.Section>
                  <ActionPanel.Section>
                    <Action.CopyToClipboard
                      title="Copy Address"
                      content={describeTarget(connection.target)}
                      shortcut={Keyboard.Shortcut.Common.Copy}
                    />
                    <Action.CopyToClipboard
                      title="Copy Connect URL"
                      content={targetUrl(connection.target)}
                      shortcut={Keyboard.Shortcut.Common.CopyPath}
                    />
                  </ActionPanel.Section>
                  <ActionPanel.Section>
                    <ImportAction />
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

function AddAction({ onSave }: { onSave: (connection: SavedConnection) => Promise<void> }) {
  return (
    <Action.Push
      title="Add Connection"
      icon={Icon.Plus}
      shortcut={Keyboard.Shortcut.Common.New}
      target={<ConnectionForm connection={blankConnection()} isNew onSave={onSave} />}
    />
  );
}

function ImportAction() {
  async function launchImport() {
    try {
      await launchCommand({ name: 'import-connections', type: LaunchType.UserInitiated });
    } catch (error) {
      await showFailureToast(error, { title: 'Could not open Import Connections' });
    }
  }

  return (
    <Action
      title="Import Connections…"
      icon={Icon.Download}
      shortcut={{ modifiers: ['cmd'], key: 'i' }}
      onAction={launchImport}
    />
  );
}
