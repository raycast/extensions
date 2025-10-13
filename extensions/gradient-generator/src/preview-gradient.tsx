import {
  Action,
  ActionPanel,
  Detail,
  Form,
  Icon,
  Keyboard,
  Toast,
  showToast,
  useNavigation,
} from '@raycast/api';
import { useLocalStorage } from '@raycast/utils';
import React, { useMemo, useState } from 'react';
import { Gradient } from './types';
import {
  pngDataUri,
  toCss,
  toSwiftUI,
  toTailwind,
  randomHex,
} from './lib/grad';

type Props = Partial<Gradient>;

const ensureDefaults = (g?: Props): Gradient => ({
  type: g?.type ?? 'linear',
  angle: g?.angle ?? 90,
  stops: g?.stops && g.stops.length >= 2 ? g.stops : ['#FF5733', '#33C1FF'],
});

export default function PreviewGradient(props: Props) {
  const initial = ensureDefaults(props);
  const [gradient, setGradient] = useState<Gradient>(initial);
  const { value: saved = [], setValue: setSaved } = useLocalStorage<Gradient[]>(
    'saved-gradients',
    [],
  );

  const hasEnoughStops = gradient.stops.length >= 2;

  // Prefer PNG for Raycast markdown reliability
  const png = useMemo(() => pngDataUri(gradient, 800, 480), [gradient]);
  const css = useMemo(() => toCss(gradient), [gradient]);
  const swift = useMemo(() => toSwiftUI(gradient), [gradient]);
  const tw = useMemo(() => toTailwind(gradient), [gradient]);

  const markdown = `# Gradient Preview\n\n![Gradient](${png})\n\n## CSS\n\n\`\`\`css\n${css}\n\`\`\`\n\n## SwiftUI\n\n\`\`\`swift\n${swift}\n\`\`\`\n\n## Tailwind\n\n\`\`\`txt\n${tw}\n\`\`\``;

  const onSave = async () => {
    const next = [...saved, gradient];
    await setSaved(next);
    await showToast({ style: Toast.Style.Success, title: 'Saved Gradient' });
  };

  const onAddStop = () => {
    setGradient((g) => ({ ...g, stops: [...g.stops, randomHex()] }));
  };

  return (
    <Detail
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.TagList title="Type / Angle">
            <Detail.Metadata.TagList.Item text={gradient.type} />
            {gradient.type === 'linear' ? (
              <Detail.Metadata.TagList.Item text={`${gradient.angle}°`} />
            ) : null}
          </Detail.Metadata.TagList>
          <Detail.Metadata.Separator />
          <Detail.Metadata.TagList title="Stops">
            {gradient.stops.map((c, idx) => (
              <Detail.Metadata.TagList.Item
                key={`${idx}-${c}`}
                text={c}
                color={c}
              />
            ))}
          </Detail.Metadata.TagList>
          {!hasEnoughStops ? (
            <Detail.Metadata.Label
              title="Note"
              text="At least two color stops are required."
            />
          ) : null}
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label title="Size" text="800 × 480" />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action
            icon={Icon.Plus}
            title="Add Color Stop"
            onAction={onAddStop}
            shortcut={
              { modifiers: ['cmd', 'shift'], key: 'n' } as Keyboard.Shortcut
            }
          />
          <Action icon={Icon.Folder} title="Save Gradient" onAction={onSave} />
          <Action.Push
            icon={Icon.TextCursor}
            title="Save With Label"
            shortcut={{ modifiers: ['cmd'], key: 'l' } as Keyboard.Shortcut}
            target={
              <LabelGradient
                initial={gradient}
                onSave={async (g) => {
                  const next = [...saved, g];
                  await setSaved(next);
                  await showToast({
                    style: Toast.Style.Success,
                    title: 'Saved with Label',
                  });
                }}
              />
            }
          />
          {hasEnoughStops ? (
            <>
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
              <ActionPanel.Section title="Paste into Active App">
                <Action.Paste
                  title="Paste CSS"
                  content={css}
                  shortcut={
                    { modifiers: ['cmd', 'opt'], key: 'c' } as Keyboard.Shortcut
                  }
                />
                <Action.Paste
                  title="Paste SwiftUI"
                  content={swift}
                  shortcut={
                    { modifiers: ['cmd', 'opt'], key: 's' } as Keyboard.Shortcut
                  }
                />
                <Action.Paste
                  title="Paste Tailwind"
                  content={tw}
                  shortcut={
                    { modifiers: ['cmd', 'opt'], key: 't' } as Keyboard.Shortcut
                  }
                />
              </ActionPanel.Section>
            </>
          ) : null}
        </ActionPanel>
      }
    />
  );
}

type LabelProps = { initial: Gradient; onSave: (g: Gradient) => Promise<void> };
function LabelGradient({ initial, onSave }: LabelProps) {
  const { pop } = useNavigation();
  const [label, setLabel] = useState<string>(initial.label ?? '');
  return (
    <Form
      actions={
        <ActionPanel>
          <Action
            title="Save"
            icon={Icon.Folder}
            onAction={async () => {
              await onSave({ ...initial, label: label.trim() || undefined });
              pop();
            }}
          />
          <Action title="Cancel" icon={Icon.Xmark} onAction={pop} />
        </ActionPanel>
      }
    >
      <Form.Description text="Add an optional label for this gradient." />
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
