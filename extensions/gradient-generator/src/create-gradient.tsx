import {
  Action,
  ActionPanel,
  Clipboard,
  Form,
  Icon,
  Toast,
  showToast,
  useNavigation,
} from '@raycast/api';
import React, { useState } from 'react';
import PreviewGradient from './preview-gradient';
import { GradType } from './types';
import { randomHex } from './lib/grad';

const isValidHex = (s: string): boolean =>
  /^#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})$/.test(s.trim());

export default function CreateGradient() {
  const { push } = useNavigation();
  const [type, setType] = useState<GradType>('linear');
  const [stops, setStops] = useState<string[]>(['#FF5733', '#33C1FF']);
  const [angle, setAngle] = useState<string>('90');
  const [label, setLabel] = useState<string>('');

  const presets: Record<string, string[]> = {
    Sunset: ['#EE7752', '#E73C7E', '#23A6D5'],
    Ocean: ['#0B486B', '#F56217'],
    Forest: ['#5A3F37', '#2C7744'],
    Aurora: ['#9CECFB', '#65C7F7', '#0052D4'],
    Candy: ['#FBD3E9', '#BB377D'],
  };

  const setStop = (index: number, value: string) => {
    setStops((prev) => prev.map((c, i) => (i === index ? value : c)));
  };

  const addStop = () => {
    setStops((prev) => (prev.length >= 6 ? prev : [...prev, randomHex()]));
  };

  const removeLastStop = () => {
    setStops((prev) => (prev.length <= 2 ? prev : prev.slice(0, -1)));
  };

  const swapStops = () => {
    setStops((prev) => {
      const next = [...prev];
      if (next.length >= 2) {
        const tmp = next[0];
        next[0] = next[1];
        next[1] = tmp;
      }
      return next;
    });
  };

  const randomize = () => {
    setStops((prev) => prev.map(() => randomHex()));
  };

  const applyPreset = (key: string) => {
    if (key in presets) setStops(presets[key]);
  };

  // Removed color picker integration for simplicity.

  const handleSubmit = async () => {
    if (stops.length < 2 || stops.some((c) => !isValidHex(c))) {
      await showToast({
        style: Toast.Style.Failure,
        title: 'Please enter valid colors.',
      });
      return;
    }
    const angleNum = Number(angle);
    const clamped = Number.isFinite(angleNum)
      ? Math.min(360, Math.max(0, angleNum))
      : 90;
    await push(
      <PreviewGradient
        type={type}
        angle={type === 'linear' ? clamped : undefined}
        stops={stops}
      />,
    );
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            icon={Icon.Eye}
            title="Preview Gradient"
            onSubmit={handleSubmit}
          />
          <Action icon={Icon.Plus} title="Add Color Stop" onAction={addStop} />
          <Action
            icon={Icon.Minus}
            title="Remove Last Stop"
            onAction={removeLastStop}
          />
          <Action
            icon={Icon.ArrowClockwise}
            title="Swap First Two Stops"
            onAction={swapStops}
          />
          <Action
            icon={Icon.ArrowClockwise}
            title="Randomize Colors"
            onAction={randomize}
          />
          <ActionPanel.Section title="Paste from Clipboard">
            {stops.map((_, i) => (
              <Action
                key={`paste-${i}`}
                icon={Icon.Clipboard}
                title={`Paste Color ${i + 1}`}
                onAction={async () => {
                  const txt = (await Clipboard.readText())?.trim();
                  if (txt && isValidHex(txt)) setStop(i, txt.toUpperCase());
                  else
                    await showToast({
                      style: Toast.Style.Failure,
                      title: 'Clipboard did not contain a valid hex color.',
                    });
                }}
              />
            ))}
          </ActionPanel.Section>
        </ActionPanel>
      }
    >
      <Form.Description text="Design a gradient quickly with presets, color picker, and clipboard helpers." />
      <Form.TextField
        id="label"
        title="Label (optional)"
        value={label}
        onChange={setLabel}
        placeholder="e.g. Hero Background"
      />
      <Form.Dropdown
        id="type"
        title="Type"
        value={type}
        onChange={(v) => setType(v as GradType)}
      >
        <Form.Dropdown.Item value="linear" title="linear" />
        <Form.Dropdown.Item value="radial" title="radial" />
        <Form.Dropdown.Item value="conic" title="conic" />
      </Form.Dropdown>
      <Form.Dropdown
        id="preset"
        title="Preset"
        storeValue
        onChange={applyPreset}
      >
        <Form.Dropdown.Item value="Sunset" title="Sunset" />
        <Form.Dropdown.Item value="Ocean" title="Ocean" />
        <Form.Dropdown.Item value="Forest" title="Forest" />
        <Form.Dropdown.Item value="Aurora" title="Aurora" />
        <Form.Dropdown.Item value="Candy" title="Candy" />
      </Form.Dropdown>
      {stops.map((c, i) => (
        <Form.TextField
          key={`c-${i}`}
          id={`color-${i}`}
          title={`Color ${i + 1}`}
          value={c}
          onChange={(v) => setStop(i, v)}
          info={isValidHex(c) ? undefined : 'Enter a hex like #AABBCC'}
          placeholder="#AABBCC"
        />
      ))}
      {type === 'linear' ? (
        <Form.TextField
          id="angle"
          title="Angle (deg)"
          value={angle}
          onChange={setAngle}
        />
      ) : null}
    </Form>
  );
}
