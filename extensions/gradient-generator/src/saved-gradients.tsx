import {
  Action,
  ActionPanel,
  Alert,
  Icon,
  Image,
  List,
  LocalStorage,
  confirmAlert,
  getPreferenceValues,
} from '@raycast/api';
import { showFailureToast } from '@raycast/utils';
import React, { useMemo } from 'react';
import PreviewGradient from './gradient-preview';
import CreateGradient from './create-gradient';
import { pngDataUri, toCss, toSwiftUI, toTailwind } from './lib/grad';
import { entryRef, STORAGE_KEY } from './lib/library';
import { library, refreshLibrary, useLibrary } from './lib/use-library';
import { saveGradient, shortcut } from './lib/actions';
import LabelForm from './components/label-form';

export default function SavedGradients() {
  const { items, error, isLoading } = useLibrary();
  const { tailwindOutputMode = 'utility' } = getPreferenceValues<Preferences>();
  const rows = useMemo(
    () =>
      items.map((g, index) => ({
        g,
        ref: entryRef(g, index),
        png: pngDataUri(g, 88, 56),
      })),
    [items],
  );
  const retry = (
    <Action
      title="Reload Library"
      icon={Icon.ArrowClockwise}
      onAction={refreshLibrary}
    />
  );
  if (error)
    return (
      <List>
        <List.EmptyView
          icon={Icon.Warning}
          title="Saved Library Could Not Be Read"
          description={`${error.message} Your stored data has not been changed.`}
          actions={
            <ActionPanel>
              {retry}
              <Action
                title="Copy Original Library JSON"
                icon={Icon.Clipboard}
                onAction={async () => {
                  try {
                    const { Clipboard } = await import('@raycast/api');
                    await Clipboard.copy(
                      (await LocalStorage.getItem<string>(STORAGE_KEY)) ?? '[]',
                    );
                  } catch (reason) {
                    await showFailureToast(reason, {
                      title: 'Could Not Copy Library',
                    });
                  }
                }}
              />
            </ActionPanel>
          }
        />
      </List>
    );
  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search saved gradients…">
      <List.EmptyView
        title="No Saved Gradients"
        description="Create a gradient, then choose Save Gradient in Preview."
        actions={
          <ActionPanel>
            <Action.Push title="Create Gradient" target={<CreateGradient />} />
            {retry}
          </ActionPanel>
        }
      />
      {rows.map(({ g, ref, png }) => (
        <List.Item
          key={`${ref.index}-${ref.snapshot}`}
          title={g.label || `${g.type} gradient`}
          subtitle={
            g.type === 'linear'
              ? `${g.angle ?? 90}° · ${g.stops.length} stops`
              : `${g.type} · ${g.stops.length} stops`
          }
          keywords={[g.type, ...g.stops]}
          icon={{ source: png, mask: Image.Mask.RoundedRectangle }}
          accessories={g.stops
            .slice(0, 3)
            .map((c) => ({ tag: { value: c, color: c } }))}
          actions={
            <ActionPanel>
              <Action.Push
                title="Open Preview"
                target={<PreviewGradient {...g} savedRef={ref} />}
              />
              <Action.Push
                title="Edit Label"
                icon={Icon.Text}
                shortcut={shortcut('r')}
                target={
                  <LabelForm
                    initialLabel={g.label}
                    onSubmit={async (label) =>
                      Boolean(await saveGradient({ ...g, label }, ref))
                    }
                  />
                }
              />
              <Action.CopyToClipboard
                title="Copy CSS"
                content={toCss(g)}
                shortcut={shortcut('c', ['shift'])}
              />
              <Action.CopyToClipboard
                title="Copy SwiftUI"
                content={toSwiftUI(g)}
                shortcut={shortcut('s', ['shift'])}
              />
              <Action.CopyToClipboard
                title="Copy Tailwind"
                content={toTailwind(g, tailwindOutputMode)}
                shortcut={shortcut('t', ['shift'])}
              />
              <Action
                title="Delete Gradient"
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                onAction={async () => {
                  try {
                    if (
                      await confirmAlert({
                        title: 'Delete Gradient?',
                        message: g.label || g.stops.join(' → '),
                        primaryAction: {
                          title: 'Delete',
                          style: Alert.ActionStyle.Destructive,
                        },
                        dismissAction: { title: 'Cancel' },
                      })
                    ) {
                      await library.remove(ref);
                      refreshLibrary();
                    }
                  } catch (reason) {
                    await showFailureToast(reason, {
                      title: 'Could Not Delete Gradient',
                    });
                  }
                }}
              />
              {retry}
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
