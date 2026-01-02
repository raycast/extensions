import {
  Action,
  ActionPanel,
  Alert,
  Form,
  Icon,
  Image,
  Keyboard,
  List,
  Toast,
  confirmAlert,
  showToast,
  useNavigation,
} from '@raycast/api';
import React, { useState } from 'react';
import { useLocalStorage } from '@raycast/utils';
import PreviewGradient from './gradient-preview';
import { Gradient } from './types';
import { pngDataUri, toCss, toSwiftUI, toTailwind } from './lib/grad';

export default function SavedGradients() {
  const {
    value: saved = [],
    setValue: setSaved,
    isLoading,
  } = useLocalStorage<Gradient[]>('saved-gradients', []);

  const onDelete = async (index: number) => {
    const next = saved.filter((_, i) => i !== index);
    await setSaved(next);
  };

  const onRename = async (index: number, newLabel: string) => {
    const trimmedLabel = newLabel.trim();
    if (!trimmedLabel) {
      await showToast({
        style: Toast.Style.Failure,
        title: 'Label cannot be empty',
      });
      return;
    }

    // Check for name collisions
    const existingIndex = saved.findIndex(
      (g, i) => i !== index && g.label === trimmedLabel,
    );
    if (existingIndex !== -1) {
      const ok = await confirmAlert({
        title: 'Name Already Exists',
        message: `A gradient with the label "${trimmedLabel}" already exists. Do you want to overwrite it?`,
        primaryAction: {
          title: 'Overwrite',
          style: Alert.ActionStyle.Destructive,
        },
        dismissAction: { title: 'Cancel' },
      });
      if (!ok) return;

      // Remove the existing gradient when overwriting
      const next = [...saved];
      next.splice(existingIndex, 1);
      // Adjust the index if the removed item was before the current one
      const adjustedIndex = existingIndex < index ? index - 1 : index;
      next[adjustedIndex] = { ...next[adjustedIndex], label: trimmedLabel };
      await setSaved(next);
    } else {
      // No collision, just rename
      const next = [...saved];
      next[index] = { ...next[index], label: trimmedLabel };
      await setSaved(next);
    }
    await showToast({
      style: Toast.Style.Success,
      title: 'Gradient renamed',
    });
  };

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search saved gradients…">
      <List.Section title="My Gradients" subtitle={`${saved.length}`}>
        {saved.map((g, idx) => {
          const icon = {
            source: pngDataUri(g, 88, 56),
            mask: Image.Mask.RoundedRectangle,
          } as const;
          const css = toCss(g);
          const swift = toSwiftUI(g);
          const tw = toTailwind(g);
          return (
            <List.Item
              key={`${idx}-${g.type}-${g.angle ?? 0}`}
              title={
                g.label ??
                (g.type === 'linear' ? `${g.type} (${g.angle ?? 90}°)` : g.type)
              }
              subtitle={
                g.type === 'linear' ? `${g.type} • ${g.angle ?? 90}°` : g.type
              }
              icon={icon}
              accessories={g.stops
                .slice(0, 3)
                .map((c) => ({ tag: { value: c, color: c } }))}
              actions={
                <ActionPanel>
                  <Action.Push
                    title="Open Preview"
                    target={<PreviewGradient {...g} />}
                  />
                  <ActionPanel.Section title="Label">
                    <Action.Push
                      title="Quick Rename"
                      icon={Icon.Text}
                      shortcut={
                        { modifiers: ['cmd'], key: 'r' } as Keyboard.Shortcut
                      }
                      target={
                        <QuickRenameForm
                          initialLabel={g.label}
                          onSubmit={(label) => onRename(idx, label)}
                        />
                      }
                    />
                    <Action.Push
                      title="Edit Label"
                      icon={Icon.Text}
                      target={
                        <EditLabelForm
                          initialLabel={g.label}
                          onSubmit={async (label) => {
                            const next = [...saved];
                            next[idx] = {
                              ...g,
                              label: label.trim() || undefined,
                            };
                            await setSaved(next);
                            await showToast({
                              style: Toast.Style.Success,
                              title: 'Label updated',
                            });
                          }}
                        />
                      }
                    />
                    {g.label ? (
                      <Action
                        title="Clear Label"
                        icon={Icon.Xmark}
                        onAction={async () => {
                          const next = [...saved];
                          next[idx] = { ...g, label: undefined };
                          await setSaved(next);
                          await showToast({
                            style: Toast.Style.Success,
                            title: 'Label cleared',
                          });
                        }}
                      />
                    ) : null}
                  </ActionPanel.Section>
                  <ActionPanel.Section title="Copy">
                    <Action.CopyToClipboard
                      title="Copy CSS"
                      content={css}
                      shortcut={
                        {
                          modifiers: ['cmd', 'shift'],
                          key: 'c',
                        } as Keyboard.Shortcut
                      }
                    />
                    <Action.CopyToClipboard
                      title="Copy SwiftUI"
                      content={swift}
                      shortcut={
                        {
                          modifiers: ['cmd', 'shift'],
                          key: 's',
                        } as Keyboard.Shortcut
                      }
                    />
                    <Action.CopyToClipboard
                      title="Copy Tailwind"
                      content={tw}
                      shortcut={
                        {
                          modifiers: ['cmd', 'shift'],
                          key: 't',
                        } as Keyboard.Shortcut
                      }
                    />
                  </ActionPanel.Section>
                  <Action
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    title="Delete"
                    onAction={async () => {
                      const ok = await confirmAlert({
                        title: 'Delete Gradient?',
                        message: g.label ?? g.stops.join(' → '),
                        primaryAction: {
                          title: 'Delete',
                          style: Alert.ActionStyle.Destructive,
                        },
                        dismissAction: { title: 'Cancel' },
                      });
                      if (ok) {
                        await onDelete(idx);
                      }
                    }}
                  />
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>
    </List>
  );
}

type EditLabelFormProps = {
  initialLabel?: string;
  onSubmit: (label: string) => Promise<void>;
};
function EditLabelForm({ initialLabel, onSubmit }: EditLabelFormProps) {
  const { pop } = useNavigation();
  const [label, setLabel] = useState<string>(initialLabel ?? '');
  return (
    <Form
      actions={
        <ActionPanel>
          <Action
            title="Save"
            icon={Icon.Folder}
            onAction={async () => {
              await onSubmit(label);
              pop();
            }}
          />
          <Action title="Cancel" icon={Icon.Xmark} onAction={pop} />
        </ActionPanel>
      }
    >
      <Form.Description text="Set a label for this gradient (optional)." />
      <Form.TextField
        id="label"
        title="Label"
        value={label}
        onChange={setLabel}
        placeholder="e.g. Sunset, Brand Accent"
      />
    </Form>
  );
}

type QuickRenameFormProps = {
  initialLabel?: string;
  onSubmit: (label: string) => Promise<void>;
};
function QuickRenameForm({ initialLabel, onSubmit }: QuickRenameFormProps) {
  const { pop } = useNavigation();
  const [label, setLabel] = useState<string>(initialLabel ?? '');
  return (
    <Form
      actions={
        <ActionPanel>
          <Action
            title="Save"
            icon={Icon.Folder}
            onAction={async () => {
              await onSubmit(label);
              pop();
            }}
          />
          <Action title="Cancel" icon={Icon.Xmark} onAction={pop} />
        </ActionPanel>
      }
    >
      <Form.Description text="Set a label for this gradient (optional)." />
      <Form.TextField
        id="label"
        title="Label"
        value={label}
        onChange={setLabel}
        placeholder="e.g. Sunset, Brand Accent"
      />
    </Form>
  );
}
