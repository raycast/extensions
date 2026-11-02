import {
  Action,
  ActionPanel,
  Detail,
  Icon,
  getPreferenceValues,
} from '@raycast/api';
import { showFailureToast } from '@raycast/utils';
import React, { useMemo, useRef, useState } from 'react';
import { Gradient } from './types';
import {
  MAX_STOPS,
  randomHex,
  toCss,
  toSvg,
  toSwiftUI,
  toTailwind,
} from './lib/grad';
import { EntryRef } from './lib/library';
import { saveGradient, shortcut } from './lib/actions';
import LabelForm from './components/label-form';
import ExportForm from './components/export-form';
import { usePreviewImage } from './lib/use-preview-image';

type Props = Gradient & {
  savedRef?: EntryRef;
  isRandomGradient?: boolean;
  onGenerateRandom?: (count?: 2 | 3) => Gradient;
};

export default function PreviewGradient({
  savedRef,
  isRandomGradient,
  onGenerateRandom,
  ...initial
}: Props) {
  const [gradient, setGradient] = useState<Gradient>(initial);
  const [source, setSource] = useState(savedRef);
  const [busy, setBusy] = useState(false);
  const submitting = useRef(false);
  const preferences = getPreferenceValues<Preferences>();
  // Labels do not change the rendered image or copied code.
  const { type, angle, stops } = gradient;
  const rendering = useMemo(
    () => ({ type, angle, stops }),
    [type, angle, stops],
  );
  const preview = usePreviewImage(rendering);
  const outputs = useMemo(() => {
    const g = rendering;
    return {
      css: toCss(g),
      swift: toSwiftUI(g),
      svg: g.type === 'conic' ? undefined : toSvg(g),
    };
  }, [rendering]);
  const tailwind = toTailwind(
    gradient,
    preferences.tailwindOutputMode ?? 'utility',
  );
  function regenerate(count?: 2 | 3) {
    if (submitting.current || !onGenerateRandom) return;
    setGradient(onGenerateRandom(count));
    setSource(undefined);
  }
  async function save(label = gradient.label) {
    if (submitting.current) return false;
    submitting.current = true;
    setBusy(true);
    try {
      const next = { ...gradient, label };
      const saved = await saveGradient(next, source);
      if (!saved) return false;
      setGradient(next);
      setSource(saved);
      return true;
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }
  return (
    <Detail
      isLoading={busy || !preview}
      navigationTitle={
        isRandomGradient ? undefined : gradient.label || 'Gradient Preview'
      }
      markdown={`${preview?.url ? `![${type} gradient with ${stops.length} evenly spaced color stops](<${preview.url}>)` : preview?.error ? `Preview could not be rendered. Reopen the command to retry.\n\n${preview.error}` : 'Generating preview…'}\n\n## CSS\n\n\`\`\`css\n${outputs.css}\n\`\`\`\n\n${type === 'conic' ? 'Conic SVG is not supported. Use PNG or CSS.\n\n' : ''}## SwiftUI\n\nUse Copy SwiftUI for a complete GeneratedGradient view (macOS 12+ / iOS 15+).\n\n## Tailwind\n\n\`\`\`text\n${tailwind}\n\`\`\``}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label
            title="Label"
            text={gradient.label || 'Unlabeled'}
          />
          <Detail.Metadata.Label title="Type" text={type} />
          {type === 'linear' && (
            <Detail.Metadata.Label title="Angle" text={`${angle ?? 90}°`} />
          )}
          <Detail.Metadata.TagList title="Colors">
            {stops.map((c, i) => (
              <Detail.Metadata.TagList.Item key={i} text={c} color={c} />
            ))}
          </Detail.Metadata.TagList>
          <Detail.Metadata.Label title="Stop Positions" text="Evenly spaced" />
          <Detail.Metadata.Label title="Preview Size" text="800 × 480" />
          <Detail.Metadata.Label
            title="Tailwind Output"
            text={
              preferences.tailwindOutputMode === 'css'
                ? 'Raw CSS'
                : 'Utility Classes'
            }
          />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          {isRandomGradient && onGenerateRandom && (
            <ActionPanel.Section title="Generate">
              <Action
                title="Random (Any)"
                icon={Icon.ArrowClockwise}
                shortcut={shortcut('r')}
                onAction={() => regenerate()}
              />
              <Action
                title="Random (2 Stops)"
                shortcut={shortcut('2')}
                onAction={() => regenerate(2)}
              />
              <Action
                title="Random (3 Stops)"
                shortcut={shortcut('3')}
                onAction={() => regenerate(3)}
              />
            </ActionPanel.Section>
          )}
          {stops.length < MAX_STOPS && (
            <Action
              title="Add Color Stop"
              icon={Icon.Plus}
              shortcut={shortcut('n', ['shift'])}
              onAction={() => {
                if (submitting.current) return;
                setGradient((g) => ({
                  ...g,
                  stops: [...g.stops, randomHex()],
                }));
              }}
            />
          )}
          <Action
            title={source ? 'Update Saved Gradient' : 'Save Gradient'}
            icon={Icon.Folder}
            onAction={async () => {
              try {
                await save();
              } catch (error) {
                await showFailureToast(error, {
                  title: 'Could Not Save Gradient',
                });
              }
            }}
          />
          <Action.Push
            title={source ? 'Edit Label' : 'Save with Label'}
            icon={Icon.Text}
            shortcut={shortcut('l')}
            target={<LabelForm initialLabel={gradient.label} onSubmit={save} />}
          />
          <Action.CopyToClipboard
            title="Copy CSS"
            content={outputs.css}
            shortcut={shortcut('c', ['shift'])}
          />
          <Action.CopyToClipboard
            title="Copy SwiftUI"
            content={outputs.swift}
            shortcut={shortcut('s', ['shift'])}
          />
          <Action.CopyToClipboard
            title="Copy Tailwind"
            content={tailwind}
            shortcut={shortcut('t', ['shift'])}
          />
          {outputs.svg && (
            <Action.CopyToClipboard title="Copy SVG" content={outputs.svg} />
          )}
          <ActionPanel.Section title="Export">
            {type !== 'conic' && (
              <Action.Push
                title="Save as SVG…"
                icon={Icon.Download}
                target={
                  <ExportForm
                    gradient={gradient}
                    format="svg"
                    directory={preferences.svgExportDirectory}
                  />
                }
              />
            )}
            <Action.Push
              title="Save as PNG…"
              icon={Icon.Download}
              target={
                <ExportForm
                  gradient={gradient}
                  format="png"
                  directory={preferences.pngExportDirectory}
                />
              }
            />
          </ActionPanel.Section>
          <ActionPanel.Section title="Paste into Active App">
            <Action.Paste
              title="Paste CSS"
              content={outputs.css}
              shortcut={shortcut('c', ['opt'])}
            />
            <Action.Paste
              title="Paste SwiftUI"
              content={outputs.swift}
              shortcut={shortcut('s', ['opt'])}
            />
            <Action.Paste
              title="Paste Tailwind"
              content={tailwind}
              shortcut={shortcut('t', ['opt'])}
            />
            {outputs.svg && (
              <Action.Paste title="Paste SVG" content={outputs.svg} />
            )}
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
