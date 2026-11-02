import {
  Action,
  ActionPanel,
  Alert,
  Form,
  Icon,
  Toast,
  confirmAlert,
  showToast,
  useNavigation,
} from '@raycast/api';
import React, { useRef, useState } from 'react';
import { Gradient } from '../types';
import {
  dimensions,
  generatePngAsync,
  PNG_SIZE_PRESETS,
  toSvg,
} from '../lib/grad';
import { exportFile, validateFilename } from '../lib/files';

export default function ExportForm({
  gradient,
  format,
  directory,
}: {
  gradient: Gradient;
  format: 'png' | 'svg';
  directory?: string;
}) {
  const { pop } = useNavigation();
  const [width, setWidth] = useState('800'),
    [height, setHeight] = useState('480');
  const [dpr, setDpr] = useState('1'),
    [filename, setFilename] = useState(`gradient.${format}`);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const submitting = useRef(false);
  async function submit() {
    if (submitting.current) return;
    const next: Record<string, string> = {};
    for (const [field, value] of Object.entries({ width, height })) {
      if (!/^\d+$/.test(value) || Number(value) <= 0)
        next[field] = 'Enter a positive whole number';
    }
    try {
      dimensions(Number(width), Number(height), Number(dpr));
    } catch (error) {
      next.width ??= (error as Error).message;
      next.height ??= (error as Error).message;
    }
    try {
      validateFilename(filename, format);
    } catch (error) {
      next.filename = (error as Error).message;
    }
    setErrors(next);
    if (Object.keys(next).length) return;
    submitting.current = true;
    setBusy(true);
    let toast: Toast | undefined;
    try {
      toast = await showToast({
        style: Toast.Style.Animated,
        title: 'Exporting Gradient…',
      });
      const saved = await exportFile({
        directory,
        filename,
        extension: format,
        generate: () =>
          format === 'png'
            ? generatePngAsync(
                gradient,
                Number(width),
                Number(height),
                Number(dpr),
              )
            : Promise.resolve(toSvg(gradient, Number(width), Number(height))),
        confirmOverwrite: (file) =>
          confirmAlert({
            title: 'Replace Existing File?',
            message: file,
            primaryAction: {
              title: 'Replace',
              style: Alert.ActionStyle.Destructive,
            },
            dismissAction: { title: 'Cancel' },
          }),
      });
      if (saved) {
        toast.style = Toast.Style.Success;
        toast.title = 'Gradient Exported';
        toast.message = filename;
        pop();
      } else await toast.hide();
    } catch (error) {
      if (toast) {
        toast.style = Toast.Style.Failure;
        toast.title = 'Export Failed';
        toast.message = (error as Error).message;
      } else
        await showToast({
          style: Toast.Style.Failure,
          title: 'Export Failed',
          message: (error as Error).message,
        });
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }
  return (
    <Form
      isLoading={busy}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={`Export ${format.toUpperCase()}`}
            icon={Icon.Download}
            onSubmit={submit}
          />
          {!busy && <Action title="Cancel" onAction={pop} />}
        </ActionPanel>
      }
    >
      <Form.Description text="Opaque, evenly spaced color stops. Maximum output: 8,192 pixels per side and 16,777,216 total pixels including DPR. The destination folder must already exist." />
      {format === 'png' && (
        <Form.Dropdown
          id="preset"
          title="Size Preset"
          defaultValue="custom"
          onChange={(value) => {
            const preset = PNG_SIZE_PRESETS[Number(value)];
            if (preset) {
              setWidth(String(preset.width));
              setHeight(String(preset.height));
            }
          }}
        >
          <Form.Dropdown.Item value="custom" title="Custom" />
          {PNG_SIZE_PRESETS.map((p, i) => (
            <Form.Dropdown.Item key={p.name} value={String(i)} title={p.name} />
          ))}
        </Form.Dropdown>
      )}
      <Form.TextField
        id="width"
        title="Width"
        placeholder="800"
        value={width}
        onChange={setWidth}
        error={errors.width}
      />
      <Form.TextField
        id="height"
        title="Height"
        placeholder="480"
        value={height}
        onChange={setHeight}
        error={errors.height}
      />
      {format === 'png' && (
        <Form.Dropdown
          id="dpr"
          title="Device Pixel Ratio"
          value={dpr}
          onChange={setDpr}
        >
          <Form.Dropdown.Item value="1" title="1×" />
          <Form.Dropdown.Item value="2" title="2×" />
        </Form.Dropdown>
      )}
      <Form.Description
        title="Output Size"
        text={`${Number(width) * Number(dpr)} × ${Number(height) * Number(dpr)} pixels`}
      />
      <Form.TextField
        id="filename"
        title="Filename"
        placeholder={`gradient.${format}`}
        value={filename}
        onChange={setFilename}
        error={errors.filename}
      />
    </Form>
  );
}
