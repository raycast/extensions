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
import React, { useState, useMemo, useCallback } from 'react';
import PreviewGradient from './gradient-preview';
import { GradType, ValidationError } from './types';
import { randomHex, validateGradient, isValidHex } from './lib/grad';
import { getPresets } from './lib/presets';

export default function CreateGradient() {
  const { push } = useNavigation();
  const [type, setType] = useState<GradType>('linear');
  const [stops, setStops] = useState<string[]>(['#FF5733', '#33C1FF']);
  const [angle, setAngle] = useState<string>('90');
  const [label, setLabel] = useState<string>('');
  const [touchedFields, setTouchedFields] = useState<Set<string>>(new Set());

  // Only validate fields that have been touched (user has finished editing)
  const validation = useMemo(() => {
    const angleNum = type === 'linear' ? Number(angle) : undefined;
    return validateGradient({ type, angle: angleNum, stops });
  }, [type, angle, stops]);

  // Helper function to get field errors (only show for touched fields)
  const getFieldErrors = (field: string): ValidationError[] => {
    if (!touchedFields.has(field)) return [];
    return validation.overall.errors.filter((e) => e.field === field);
  };

  // Helper function to get field warnings (only show for touched fields)
  const getFieldWarnings = (field: string): ValidationError[] => {
    if (!touchedFields.has(field)) return [];
    return validation.overall.warnings.filter((e) => e.field === field);
  };

  // Mark field as touched when user finishes editing
  const markFieldTouched = useCallback((field: string) => {
    setTouchedFields((prev) => new Set(prev).add(field));
  }, []);

  const presets = getPresets();

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

  const resetToDefaults = () => {
    setType('linear');
    setStops(['#FF5733', '#33C1FF']);
    setAngle('90');
    setLabel('');
    setTouchedFields(new Set());
  };

  const applyPreset = (presetName: string) => {
    const preset = presets.find((p) => p.name === presetName);
    if (preset) setStops(preset.colors);
  };

  const handleSubmit = async () => {
    // Mark all fields as touched when submitting to show all errors
    setTouchedFields(new Set(['stops', 'angle']));

    if (!validation.overall.isValid) {
      const errorMessages = validation.overall.errors
        .map((e) => e.message)
        .join(', ');
      await showToast({
        style: Toast.Style.Failure,
        title: 'Invalid gradient',
        message: errorMessages,
      });
      return;
    }

    const angleNum = type === 'linear' ? Number(angle) : undefined;
    await push(<PreviewGradient type={type} angle={angleNum} stops={stops} />);
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
          <Action
            icon={Icon.RotateAntiClockwise}
            title="Reset to Defaults"
            onAction={resetToDefaults}
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

      {/* Keyboard shortcuts info */}
      <Form.Description text="💡 Tip: Use Tab to navigate between fields, Enter to submit when ready" />

      {/* Validation Summary - only show when there are touched fields with errors */}
      {touchedFields.size > 0 && !validation.overall.isValid && (
        <Form.Description
          text={`⚠️ ${validation.overall.errors.length} error(s) found. Please fix before previewing.`}
        />
      )}

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
        {presets.map((preset) => (
          <Form.Dropdown.Item
            key={preset.name}
            value={preset.name}
            title={`${preset.name} - ${preset.description}`}
          />
        ))}
      </Form.Dropdown>
      {stops.map((c, i) => {
        const fieldErrors = getFieldErrors(`stop-${i}`);
        const fieldWarnings = getFieldWarnings(`stop-${i}`);
        const hasError = fieldErrors.length > 0;
        const hasWarning = fieldWarnings.length > 0;

        return (
          <Form.TextField
            key={`c-${i}`}
            id={`color-${i}`}
            title={`Color ${i + 1}`}
            value={c}
            onChange={(v) => setStop(i, v)}
            onBlur={() => markFieldTouched(`stop-${i}`)}
            error={hasError ? fieldErrors[0]?.message : undefined}
            info={
              hasError
                ? fieldErrors[0]?.message
                : hasWarning
                  ? fieldWarnings[0]?.message
                  : isValidHex(c)
                    ? undefined
                    : 'Enter a hex like #AABBCC'
            }
            placeholder="#AABBCC"
          />
        );
      })}
      {type === 'linear' ? (
        <Form.TextField
          id="angle"
          title="Angle (deg)"
          value={angle}
          onChange={setAngle}
          onBlur={() => markFieldTouched('angle')}
          error={getFieldErrors('angle')[0]?.message}
          info={
            getFieldErrors('angle')[0]?.message ||
            'Enter a number between 0 and 360'
          }
        />
      ) : null}
    </Form>
  );
}
