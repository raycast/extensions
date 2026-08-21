import { Action, ActionPanel, Color, Form, Icon, List, Toast, showToast, useNavigation } from '@raycast/api';
import { useCachedPromise } from '@raycast/utils';
import { useMemo, useState } from 'react';
import { Archive, Screen, archiveModifiedAt, readArchive } from './archive';
import { describeTarget, normalizeHostname, resolveTarget } from './connect';
import { ImportedScreen, toImportedScreen, useImportedScreens } from './library';
import ArchiveErrorView from './components/ArchiveErrorView';

const SECTIONS: { title: string; types: Screen['type'][] }[] = [
  { title: 'Local Network', types: ['local'] },
  { title: 'Tailscale', types: ['tailscale'] },
  { title: 'Remote', types: ['remote'] },
  { title: 'Other', types: ['url', 'saved', 'recent'] },
];

export default function Command() {
  const { push } = useNavigation();
  const [pathError, setPathError] = useState<string | undefined>();

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Choose Screens"
            icon={Icon.ArrowRight}
            onSubmit={(values: { archive: string[] }) => {
              const path = values.archive?.[0];
              if (!path) {
                setPathError('Required');
                return;
              }
              push(<SelectScreens path={path} />);
            }}
          />
        </ActionPanel>
      }
    >
      <Form.Description
        title="Screens Archive"
        text="In Screens, go to Settings → Archives → Export…, save the .screens file, then choose it here. You pick which screens to keep on the next step."
      />
      <Form.FilePicker
        id="archive"
        title="Archive"
        allowMultipleSelection={false}
        canChooseDirectories={false}
        error={pathError}
        onChange={() => setPathError(undefined)}
      />
    </Form>
  );
}

function SelectScreens({ path }: { path: string }) {
  const { pop } = useNavigation();
  const { screens: imported, setScreens } = useImportedScreens();
  const { data, isLoading, error, revalidate } = useCachedPromise(readArchive, [path, archiveModifiedAt(path)]);

  const [selected, setSelected] = useState<Set<string> | undefined>();
  const selection = selected ?? defaultSelection(data, imported);

  const all = useMemo(() => data?.screens ?? [], [data]);
  const sections = useMemo(() => groupByType(all), [all]);

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
    const keep = all.filter((screen) => selection.has(screen.id));
    await setScreens(keep.map((screen) => toImportedScreen(screen, all)));
    await showToast({
      style: Toast.Style.Success,
      title: keep.length === 1 ? 'Imported 1 screen' : `Imported ${keep.length} screens`,
    });
    pop();
  }

  return (
    <List
      isLoading={isLoading}
      navigationTitle={`Import Screens — ${selection.size} of ${all.length} selected`}
      searchBarPlaceholder="Filter screens"
    >
      {sections.map((section) => (
        <List.Section key={section.title} title={section.title} subtitle={`${section.screens.length}`}>
          {section.screens.map((screen) => {
            const target = resolveTarget(screen, all);
            const checked = selection.has(screen.id);
            return (
              <List.Item
                key={screen.id}
                icon={
                  checked
                    ? { source: Icon.CheckCircle, tintColor: Color.Green }
                    : { source: Icon.Circle, tintColor: Color.SecondaryText }
                }
                title={screen.name || normalizeHostname(screen.hostname)}
                subtitle={describeTarget(target)}
                accessories={pickerAccessories(screen, target.kind === 'saved' && target.ambiguous)}
                actions={
                  <ActionPanel>
                    <Action
                      title={checked ? 'Exclude' : 'Include'}
                      icon={checked ? Icon.Circle : Icon.CheckCircle}
                      onAction={() => toggle(screen.id)}
                    />
                    <Action
                      title={`Import ${selection.size} ${selection.size === 1 ? 'Screen' : 'Screens'}`}
                      icon={Icon.Download}
                      shortcut={{ modifiers: ['cmd'], key: 'return' }}
                      onAction={save}
                    />
                    <ActionPanel.Section>
                      <Action
                        title="Select All"
                        icon={Icon.CheckCircle}
                        shortcut={{ modifiers: ['cmd', 'shift'], key: 'a' }}
                        onAction={() => setAll(all.map((item) => item.id))}
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
                        onAction={() => setAll(all.filter(hasBeenUsed).map((item) => item.id))}
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

/**
 * Screens lists everything it discovers on the local network, so a fresh archive is mostly hosts
 * the user has never opened. Preselect the ones they have actually connected to, or the ones they
 * kept last time if this is a re-import.
 */
function defaultSelection(archive: Archive | undefined, imported: ImportedScreen[]): Set<string> {
  if (!archive) return new Set();
  if (imported.length > 0) {
    const kept = new Set(imported.map((screen) => screen.id));
    return new Set(archive.screens.filter((screen) => kept.has(screen.id)).map((screen) => screen.id));
  }
  return new Set(archive.screens.filter(hasBeenUsed).map((screen) => screen.id));
}

function hasBeenUsed(screen: Screen): boolean {
  return screen.numberOfConnections > 0 || screen.lastConnectionDate !== undefined;
}

function pickerAccessories(screen: Screen, ambiguous: boolean): List.Item.Accessory[] {
  const accessories: List.Item.Accessory[] = [];

  if (ambiguous) {
    accessories.push({
      icon: { source: Icon.ExclamationMark, tintColor: Color.Orange },
      tooltip: 'Another screen shares this name and hostname, so Screens decides which one opens.',
    });
  }

  accessories.push({
    text: screen.numberOfConnections > 0 ? `${screen.numberOfConnections}×` : 'never used',
    tooltip: 'Times connected, according to the archive',
  });

  if (screen.lastConnectionDate) {
    accessories.push({ date: screen.lastConnectionDate });
  }

  return accessories;
}

function groupByType(screens: Screen[]): { title: string; screens: Screen[] }[] {
  return SECTIONS.map((section) => ({
    title: section.title,
    screens: screens.filter((screen) => section.types.includes(screen.type)).sort(byUsage),
  })).filter((section) => section.screens.length > 0);
}

function byUsage(a: Screen, b: Screen): number {
  const difference = (b.lastConnectionDate?.getTime() ?? 0) - (a.lastConnectionDate?.getTime() ?? 0);
  return difference !== 0 ? difference : b.numberOfConnections - a.numberOfConnections;
}
