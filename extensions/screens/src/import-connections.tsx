import { Action, ActionPanel, Color, Form, Icon, List, Toast, popToRoot, showToast, useNavigation } from '@raycast/api';
import { FormValidation, useCachedPromise, useForm } from '@raycast/utils';
import { useMemo, useState } from 'react';
import { Archive, Connection, archiveModifiedAt, readArchive } from './archive';
import { ALL_TYPES, connectionAccessories, groupByType, occupiedSections, targetStatus } from './connection-type';
import { describeTarget, normalizeHostname, resolveTarget } from './connect';
import { SavedConnection, toSavedConnection, useSavedConnections } from './library';
import ArchiveErrorView from './components/ArchiveErrorView';
import TypeFilter from './components/TypeFilter';

export default function Command() {
  const { push } = useNavigation();

  const { handleSubmit, itemProps } = useForm<{ archive: string[] }>({
    validation: { archive: FormValidation.Required },
    onSubmit: (values) => push(<SelectConnections path={values.archive[0]} />),
  });

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Choose Connections" icon={Icon.ArrowRight} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description
        title="Screens Archive"
        text="In Screens, go to Settings → Archives → Export…, save the .screens file, then choose it here. You pick which connections to keep on the next step."
      />
      <Form.FilePicker
        title="Archive"
        allowMultipleSelection={false}
        canChooseDirectories={false}
        {...itemProps.archive}
      />
    </Form>
  );
}

function SelectConnections({ path }: { path: string }) {
  const { connections: saved, setConnections } = useSavedConnections();
  const modifiedAt = useMemo(() => archiveModifiedAt(path), [path]);
  const { data, isLoading, error, revalidate } = useCachedPromise(readArchive, [path, modifiedAt]);

  const [selected, setSelected] = useState<Set<string> | undefined>();
  const [filter, setFilter] = useState(ALL_TYPES);
  const selection = selected ?? defaultSelection(data, saved);

  const all = useMemo(() => data?.connections ?? [], [data]);
  const sections = useMemo(() => groupByType(all, filter, byUsage), [all, filter]);
  const availableSections = useMemo(() => occupiedSections(all), [all]);

  if (error) {
    return <ArchiveErrorView error={error} onRetry={revalidate} />;
  }

  function toggle(id: string) {
    const next = new Set(selection);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  }

  function setAll(ids: string[]) {
    setSelected(new Set(ids));
  }

  async function save() {
    const keep = all.filter((connection) => selection.has(connection.id));

    // An import replaces only what this archive covers. A connection added by hand, or kept from a
    // different archive, is one this archive has no opinion about, so importing leaves it alone.
    const covered = new Set(all.map((connection) => connection.id));
    const untouched = saved.filter((connection) => !covered.has(connection.id));

    await setConnections([...untouched, ...keep.map((connection) => toSavedConnection(connection, all))]);
    await showToast({
      style: Toast.Style.Success,
      title: keep.length === 1 ? 'Imported 1 connection' : `Imported ${keep.length} connections`,
    });
    await popToRoot();
  }

  return (
    <List
      isLoading={isLoading}
      navigationTitle={navigationTitle(selection.size, all.length, data?.exportedAt)}
      searchBarPlaceholder="Filter connections"
      searchBarAccessory={<TypeFilter sections={availableSections} value={filter} onChange={setFilter} />}
    >
      {sections.map((section) => (
        <List.Section key={section.title} title={section.title} subtitle={`${section.connections.length}`}>
          {section.connections.map((connection) => {
            const target = resolveTarget(connection, all);
            const checked = selection.has(connection.id);
            return (
              <List.Item
                key={connection.id}
                icon={
                  checked
                    ? { source: Icon.CheckCircle, tintColor: Color.Green }
                    : { source: Icon.Circle, tintColor: Color.SecondaryText }
                }
                title={connection.name || normalizeHostname(connection.hostname)}
                subtitle={describeTarget(target)}
                accessories={connectionAccessories(connection.type, targetStatus(target), archiveUsage(connection))}
                actions={
                  <ActionPanel>
                    <Action
                      title={checked ? 'Exclude' : 'Include'}
                      icon={checked ? Icon.Circle : Icon.CheckCircle}
                      onAction={() => toggle(connection.id)}
                    />
                    <Action
                      title={`Import ${selection.size} ${selection.size === 1 ? 'Connection' : 'Connections'}`}
                      icon={Icon.Download}
                      shortcut={{ modifiers: ['cmd'], key: 'return' }}
                      onAction={save}
                    />
                    <ActionPanel.Section>
                      <Action
                        title="Select All"
                        icon={Icon.CheckCircle}
                        shortcut={{ modifiers: ['cmd', 'shift'], key: 'a' }}
                        onAction={() => setAll(all.map((entry) => entry.id))}
                      />
                      <Action
                        title="Select None"
                        icon={Icon.Circle}
                        shortcut={{ modifiers: ['cmd', 'shift'], key: 'n' }}
                        onAction={() => setAll([])}
                      />
                      <Action
                        title="Select Previously Connected"
                        icon={Icon.Clock}
                        shortcut={{ modifiers: ['cmd', 'shift'], key: 'u' }}
                        onAction={() => setAll(all.filter(hasBeenUsed).map((entry) => entry.id))}
                      />
                    </ActionPanel.Section>
                  </ActionPanel>
                }
              />
            );
          })}
        </List.Section>
      ))}
    </List>
  );
}

/** Keeps the export date in view, so importing from a stale archive is a visible choice. */
function navigationTitle(selected: number, total: number, exportedAt: Date | undefined): string {
  const counts = `${selected} of ${total} selected`;
  if (!exportedAt) return counts;
  return `${counts} · exported ${exportedAt.toLocaleDateString(undefined, { dateStyle: 'medium' })}`;
}

/**
 * Screens lists everything it discovers on the local network, so a fresh archive is mostly hosts
 * the user has never opened. Preselect the ones they have actually connected to, or the ones they
 * kept last time if this is a re-import.
 */
function defaultSelection(archive: Archive | undefined, saved: SavedConnection[]): Set<string> {
  if (!archive) return new Set();
  if (saved.length > 0) {
    const kept = new Set(saved.map((connection) => connection.id));
    return new Set(archive.connections.filter((entry) => kept.has(entry.id)).map((entry) => entry.id));
  }
  return new Set(archive.connections.filter(hasBeenUsed).map((entry) => entry.id));
}

function hasBeenUsed(connection: Connection): boolean {
  return connection.numberOfConnections > 0 || connection.lastConnectionDate !== undefined;
}

/**
 * What Screens recorded about this connection. It is accurate here, where the archive itself is
 * what's on screen, and is what the default selection is drawn from.
 */
function archiveUsage(connection: Connection): List.Item.Accessory[] {
  const used = connection.numberOfConnections > 0;

  return [
    {
      text: used ? `${connection.numberOfConnections}×` : null,
      tooltip: used ? 'Times connected, according to the archive' : null,
    },
    {
      date: connection.lastConnectionDate ?? null,
      tooltip: connection.lastConnectionDate ? 'Last connected, according to the archive' : null,
    },
  ];
}

function byUsage(a: Connection, b: Connection): number {
  const difference = (b.lastConnectionDate?.getTime() ?? 0) - (a.lastConnectionDate?.getTime() ?? 0);
  return difference !== 0 ? difference : b.numberOfConnections - a.numberOfConnections;
}
