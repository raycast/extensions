import { Action, ActionPanel, Form, getPreferenceValues, Icon, open, showToast, Toast } from "@raycast/api";
import { FormValidation, showFailureToast, useForm } from "@raycast/utils";
import { useRef, useState } from "react";
import {
  COLOR_PRESETS,
  CUSTOM_COLOR_VALUE,
  DEFAULT_COLOR,
  isLowContrast,
  isValidHexColor,
  normalizeHexColor,
  resolveColorPreference,
} from "./config";
import { appendUtmParams, isHttpUrl, shortenUrl } from "./url";
import { copyQRCodeToClipboard, generateQRCode, QRCodeView, saveQRCode } from "./utils";

type FormatValue = "png" | "svg" | "png-bg";

interface FormValues {
  url: string;
  inline: boolean;
  copy?: boolean;
  format: FormatValue;
  color: string;
  customColor: string;
  shorten: boolean;
  utmEnabled: boolean;
  utmSource: string;
  utmMedium: string;
  utmCampaign: string;
  utmTerm: string;
  utmContent: string;
}

/** The raw selected color string (a preset value or the custom hex input). */
function selectedColor(values: FormValues): string {
  return values.color === CUSTOM_COLOR_VALUE ? values.customColor : values.color;
}

/** The effective, normalized color to render with, falling back to black for invalid input. */
function resolveColor(values: FormValues): string {
  const raw = selectedColor(values);
  return isValidHexColor(raw) ? normalizeHexColor(raw) : DEFAULT_COLOR;
}

/**
 * Apply UTM params then (optionally) shorten. Returns the final URL to encode,
 * or null if shortening was requested but failed (caller should abort so the
 * error stays visible instead of silently encoding the long URL).
 */
async function prepareUrl(values: FormValues): Promise<string | null> {
  let url = values.url;

  if (values.utmEnabled) {
    url = appendUtmParams(url, {
      source: values.utmSource,
      medium: values.utmMedium,
      campaign: values.utmCampaign,
      term: values.utmTerm,
      content: values.utmContent,
    });
  }

  // Shortening only applies to http(s) links; for plain text we skip it and encode the content as-is.
  if (values.shorten && isHttpUrl(url)) {
    const toast = await showToast({ style: Toast.Style.Animated, title: "Shortening link..." });
    try {
      url = await shortenUrl(url);
      toast.style = Toast.Style.Success;
      toast.title = "Link shortened";
    } catch (error) {
      await showFailureToast(error, { title: "Failed to shorten link" });
      return null;
    }
  }

  return url;
}

export default function Command() {
  const { primaryAction, defaultColor } = getPreferenceValues<Preferences.Index>();
  const [qrData, setQrData] = useState<string>();

  // The default-color preference pre-fills the custom field; the form opens directly in Custom mode.
  const initialColor = resolveColorPreference(defaultColor);

  // Tracks the current dropdown selection so customColor validation only fires when "Custom…" is active.
  const colorModeRef = useRef<string>(CUSTOM_COLOR_VALUE);

  const { handleSubmit, itemProps, values } = useForm<FormValues>({
    initialValues: {
      color: CUSTOM_COLOR_VALUE,
      customColor: initialColor,
    },
    async onSubmit(values) {
      const color = resolveColor(values);
      const url = await prepareUrl(values);
      if (url === null) {
        return; // shortening failed — error toast already shown
      }

      if (values.inline) {
        try {
          const qrData = await generateQRCode({
            URL: url,
            format: values.format === "png-bg" ? "png" : values.format,
            preview: values.format === "png-bg",
            color,
          });
          if (!qrData) {
            throw new Error("Failed to generate QR code");
          }
          setQrData(qrData);
        } catch (error) {
          await showFailureToast(error, { title: "Failed to generate QR code" });
        }
      } else if (values.copy) {
        await copyQRCodeToClipboard({ url, format: values.format, color });
      } else {
        try {
          const savedPath = await saveQRCode({ url, format: values.format, color });
          showToast(Toast.Style.Success, "QRCode saved", `You can find it here: ${savedPath}`);
          open(savedPath);
        } catch (error) {
          await showFailureToast(error, { title: "Failed to save QR code" });
        }
      }
    },
    validation: {
      url: (value) => (value && value.trim() ? undefined : "URL or content is required"),
      format: FormValidation.Required,
      // Inline (red) error for an unparseable custom hex — that genuinely can't render.
      customColor: (value) => {
        if (colorModeRef.current !== CUSTOM_COLOR_VALUE) return undefined;
        return isValidHexColor(value) ? undefined : "Enter a valid hex color, e.g. #1D8348 or 1D8348";
      },
    },
  });

  colorModeRef.current = values.color;

  // Non-blocking warning: a valid-but-light color can still be generated, but may not scan well.
  const showLowContrast = isLowContrast(selectedColor(values));

  // "Shorten link" only affects http(s) URLs; surface that inline when it would be a no-op.
  const shortenSkipped = values.shorten && values.url.trim() !== "" && !isHttpUrl(values.url);

  const renderActions = () => {
    const saveAction = (
      <Action.SubmitForm
        title="Generate and Save"
        onSubmit={(values) => {
          handleSubmit({ ...values, inline: false } as FormValues);
        }}
      />
    );

    const showAction = (
      <Action.SubmitForm
        title="Generate and Show"
        onSubmit={(values) => {
          handleSubmit({ ...values, inline: true } as FormValues);
        }}
      />
    );

    const copyAction = (
      <Action.SubmitForm
        title="Generate and Copy to Clipboard"
        onSubmit={(values) => {
          handleSubmit({ ...values, inline: false, copy: true } as FormValues);
        }}
      />
    );

    if (primaryAction === "save") {
      return (
        <>
          {saveAction}
          {showAction}
          {copyAction}
        </>
      );
    } else if (primaryAction === "copy") {
      return (
        <>
          {copyAction}
          {saveAction}
          {showAction}
        </>
      );
    } else {
      return (
        <>
          {showAction}
          {saveAction}
          {copyAction}
        </>
      );
    }
  };

  if (qrData) {
    return <QRCodeView qrData={qrData} height={350} onBack={() => setQrData(undefined)} />;
  }

  return (
    <Form actions={<ActionPanel>{renderActions()}</ActionPanel>}>
      <Form.TextField title="URL or Content" placeholder="https://google.com" {...itemProps.url} />
      <Form.Dropdown
        id="format"
        title="Format"
        storeValue
        value={itemProps.format.value}
        onChange={(value) => itemProps.format.onChange?.(value as FormatValue)}
      >
        <Form.Dropdown.Item value="png" title="PNG (Transparent)" />
        <Form.Dropdown.Item value="png-bg" title="PNG (w/BG)" />
        <Form.Dropdown.Item value="svg" title="SVG" />
      </Form.Dropdown>
      <Form.Dropdown
        title="QR Color"
        {...itemProps.color}
        // Low-contrast warning lives on the (unfocused) dropdown so it renders inline like other
        // field errors, instead of as a focused-field popover on the hex input. Non-blocking.
        error={showLowContrast ? "Low contrast" : undefined}
      >
        {COLOR_PRESETS.map((preset) => (
          <Form.Dropdown.Item
            key={preset.value}
            value={preset.value}
            title={preset.title}
            icon={{ source: Icon.CircleFilled, tintColor: preset.value }}
          />
        ))}
        <Form.Dropdown.Item
          value={CUSTOM_COLOR_VALUE}
          title="Custom…"
          icon={
            isValidHexColor(values.customColor)
              ? { source: Icon.CircleFilled, tintColor: normalizeHexColor(values.customColor) }
              : Icon.Circle
          }
        />
      </Form.Dropdown>
      {values.color === CUSTOM_COLOR_VALUE && (
        <Form.TextField title="Custom Color (Hex)" placeholder="#1D8348 or 1D8348" {...itemProps.customColor} />
      )}
      <Form.Checkbox
        label="Shorten link"
        {...itemProps.shorten}
        info="Sends the URL to a link shortener (is.gd, da.gd, then TinyURL) to create a short link."
      />
      {shortenSkipped && (
        <Form.Description text="Shortening applies to http(s) links only — this content will be encoded as-is." />
      )}
      <Form.Separator />
      <Form.Checkbox label="Add tracking parameters (UTM)" {...itemProps.utmEnabled} />
      {values.utmEnabled && (
        <>
          <Form.Description text="UTM parameters are appended to http(s) URLs for campaign tracking." />
          <Form.TextField title="utm_source" placeholder="newsletter" {...itemProps.utmSource} />
          <Form.TextField title="utm_medium" placeholder="email" {...itemProps.utmMedium} />
          <Form.TextField title="utm_campaign" placeholder="spring_sale" {...itemProps.utmCampaign} />
          <Form.TextField title="utm_term" placeholder="running+shoes" {...itemProps.utmTerm} />
          <Form.TextField title="utm_content" placeholder="logolink" {...itemProps.utmContent} />
        </>
      )}
    </Form>
  );
}
