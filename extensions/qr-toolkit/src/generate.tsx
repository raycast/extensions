import {
  Action,
  ActionPanel,
  Clipboard,
  Color,
  Detail,
  Form,
  Icon,
  showHUD,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { useEffect, useState } from "react";
import { detectContent, QRContentType } from "./utils/detect-content";
import { DEFAULT_QR_OPTIONS, generatePNG, generateSVG, QROptions } from "./utils/generate-qr";
import { t } from "./utils/i18n";

// ─── types ───────────────────────────────────────────────────────────────────

interface QRParams {
  text: string;
  options: QROptions;
}

// ─── helpers ─────────────────────────────────────────────────────────────────

const HEX_RE = /^#[0-9a-fA-F]{6}$/;

function typeLabel(type: QRContentType): string {
  switch (type) {
    case "url":
      return t("type_url");
    case "wifi":
      return t("type_wifi");
    case "vcard":
      return t("type_vcard");
    case "text":
      return t("type_text");
  }
}

function typeColor(type: QRContentType): Color {
  switch (type) {
    case "url":
      return Color.Blue;
    case "wifi":
      return Color.Green;
    case "vcard":
      return Color.Purple;
    case "text":
      return Color.SecondaryText;
  }
}

function typeIcon(type: QRContentType): Icon {
  switch (type) {
    case "url":
      return Icon.Globe;
    case "wifi":
      return Icon.Wifi;
    case "vcard":
      return Icon.Person;
    case "text":
      return Icon.Text;
  }
}

function eccLabel(ecc: QROptions["errorCorrectionLevel"]): string {
  switch (ecc) {
    case "L":
      return t("generate_ecc_l");
    case "M":
      return t("generate_ecc_m");
    case "Q":
      return t("generate_ecc_q");
    case "H":
      return t("generate_ecc_h");
  }
}

// ─── preview ─────────────────────────────────────────────────────────────────

function QRPreview({ params }: { params: QRParams }) {
  const { pop } = useNavigation();
  const [svg, setSvg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setSvg(null);
    setError(null);
    generateSVG(params.text, params.options)
      .then(setSvg)
      .catch((err) => setError(String(err)));
  }, [params]);

  if (error) {
    return (
      <Detail
        markdown={`## ${t("generate_error_title")}\n\n${error}`}
        actions={
          <ActionPanel>
            <Action title={t("generate_back")} icon={Icon.ArrowLeft} onAction={pop} />
          </ActionPanel>
        }
      />
    );
  }

  if (!svg) {
    return <Detail isLoading markdown={`## ${t("generate_generating")}`} />;
  }

  const info = detectContent(params.text);
  const svgBase64 = Buffer.from(svg).toString("base64");
  // Render as a full-width image with no heading above it so it fills the detail pane
  const markdown = `![QR Code](data:image/svg+xml;base64,${svgBase64})`;

  async function copyPNG() {
    const tmpFile = path.join(os.tmpdir(), `qr-${Date.now()}.png`);
    try {
      const buf = await generatePNG(params.text, params.options);
      fs.writeFileSync(tmpFile, buf);
      await Clipboard.copy({ file: tmpFile });
      showHUD(t("generate_copied"));
    } catch (err) {
      showToast({ style: Toast.Style.Failure, title: t("generate_copy_failed"), message: String(err) });
    } finally {
      try {
        fs.unlinkSync(tmpFile);
      } catch {
        // already removed
      }
    }
  }

  async function savePNG() {
    try {
      const buf = await generatePNG(params.text, params.options);
      const dest = path.join(os.homedir(), "Desktop", `qr-${Date.now()}.png`);
      fs.writeFileSync(dest, buf);
      showHUD(t("generate_saved"));
    } catch (err) {
      showToast({ style: Toast.Style.Failure, title: t("generate_save_failed"), message: String(err) });
    }
  }

  return (
    <Detail
      navigationTitle={t("generate_result_title")}
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.TagList title={t("generate_type")}>
            <Detail.Metadata.TagList.Item
              text={typeLabel(info.type)}
              color={typeColor(info.type)}
              icon={typeIcon(info.type)}
            />
          </Detail.Metadata.TagList>
          <Detail.Metadata.Label title={t("generate_chars")} text={`${params.text.length}`} icon={Icon.TextCursor} />

          {info.type === "url" && info.url && (
            <>
              <Detail.Metadata.Separator />
              <Detail.Metadata.Link title="URL" target={info.url} text={info.url} />
            </>
          )}
          {info.type === "wifi" && info.wifi && (
            <>
              <Detail.Metadata.Separator />
              <Detail.Metadata.Label title="SSID" text={info.wifi.ssid} icon={Icon.Wifi} />
            </>
          )}

          <Detail.Metadata.Separator />

          <Detail.Metadata.Label
            title={t("generate_ecc")}
            text={eccLabel(params.options.errorCorrectionLevel)}
            icon={Icon.Shield}
          />
          <Detail.Metadata.TagList title={t("generate_dark_color")}>
            <Detail.Metadata.TagList.Item text={params.options.darkColor} color={params.options.darkColor} />
          </Detail.Metadata.TagList>
          <Detail.Metadata.TagList title={t("generate_light_color")}>
            <Detail.Metadata.TagList.Item text={params.options.lightColor} color={params.options.lightColor} />
          </Detail.Metadata.TagList>
          <Detail.Metadata.Label title={t("generate_margin")} text={`${params.options.margin}px`} icon={Icon.Sidebar} />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Export">
            <Action title={t("generate_copy_png")} icon={Icon.CopyClipboard} onAction={copyPNG} />
            <Action
              title={t("generate_save_png")}
              icon={Icon.Download}
              onAction={savePNG}
              shortcut={{ modifiers: ["cmd"], key: "s" }}
            />
            <Action.CopyToClipboard
              title={t("generate_copy_svg")}
              content={svg}
              icon={Icon.Code}
              shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
            />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action.CopyToClipboard title={t("generate_copy_text")} content={params.text} icon={Icon.Text} />
            <Action
              title={t("generate_back")}
              icon={Icon.ArrowLeft}
              onAction={pop}
              shortcut={{ modifiers: ["cmd"], key: "backspace" }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

// ─── main form ───────────────────────────────────────────────────────────────

export default function GenerateCommand() {
  const { push } = useNavigation();

  // Form state
  const [text, setText] = useState("");
  const [ecc, setEcc] = useState<QROptions["errorCorrectionLevel"]>(DEFAULT_QR_OPTIONS.errorCorrectionLevel);

  // Pre-fill from clipboard text
  useEffect(() => {
    Clipboard.readText().then((clipText) => {
      if (clipText && clipText.trim()) {
        setText(clipText.trim());
      }
    });
  }, []);
  const [darkColor, setDarkColor] = useState(DEFAULT_QR_OPTIONS.darkColor);
  const [lightColor, setLightColor] = useState(DEFAULT_QR_OPTIONS.lightColor);
  const [margin, setMargin] = useState(String(DEFAULT_QR_OPTIONS.margin));
  const [darkColorError, setDarkColorError] = useState<string | undefined>();
  const [lightColorError, setLightColorError] = useState<string | undefined>();

  function handleSubmit() {
    if (!text.trim()) {
      showToast({ style: Toast.Style.Failure, title: t("generate_empty") });
      return;
    }
    if (!HEX_RE.test(darkColor)) {
      setDarkColorError(t("generate_color_error"));
      return;
    }
    if (!HEX_RE.test(lightColor)) {
      setLightColorError(t("generate_color_error"));
      return;
    }
    push(
      <QRPreview
        params={{
          text: text.trim(),
          options: {
            errorCorrectionLevel: ecc,
            darkColor,
            lightColor,
            margin: parseInt(margin, 10),
          },
        }}
      />,
    );
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title={t("generate_submit")} icon={Icon.Image} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="text"
        title={t("generate_content_title")}
        placeholder={t("generate_content_placeholder")}
        value={text}
        onChange={setText}
      />

      <Form.Separator />

      <Form.Dropdown
        id="ecc"
        title={t("generate_ecc")}
        value={ecc}
        onChange={(v) => setEcc(v as QROptions["errorCorrectionLevel"])}
      >
        <Form.Dropdown.Item value="L" title={t("generate_ecc_l")} />
        <Form.Dropdown.Item value="M" title={t("generate_ecc_m")} />
        <Form.Dropdown.Item value="Q" title={t("generate_ecc_q")} />
        <Form.Dropdown.Item value="H" title={t("generate_ecc_h")} />
      </Form.Dropdown>

      <Form.TextField
        id="darkColor"
        title={t("generate_dark_color")}
        placeholder="#000000"
        value={darkColor}
        error={darkColorError}
        onChange={(v) => {
          setDarkColor(v);
          setDarkColorError(HEX_RE.test(v) ? undefined : t("generate_color_error"));
        }}
      />

      <Form.TextField
        id="lightColor"
        title={t("generate_light_color")}
        placeholder="#ffffff"
        value={lightColor}
        error={lightColorError}
        onChange={(v) => {
          setLightColor(v);
          setLightColorError(HEX_RE.test(v) ? undefined : t("generate_color_error"));
        }}
      />

      <Form.Dropdown id="margin" title={t("generate_margin")} value={margin} onChange={setMargin}>
        {[0, 1, 2, 3, 4, 5, 6, 8, 10].map((n) => (
          <Form.Dropdown.Item
            key={n}
            value={String(n)}
            title={n === DEFAULT_QR_OPTIONS.margin ? `${n}  (default)` : String(n)}
          />
        ))}
      </Form.Dropdown>
    </Form>
  );
}
