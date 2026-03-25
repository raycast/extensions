import {
  Action,
  ActionPanel,
  Detail,
  Icon,
  List,
  showToast,
  Toast,
} from "@raycast/api";
import { useAI } from "@raycast/utils";
import { useMemo, useState } from "react";
import { buildQRProps, QRPreview } from "./generate-qr";
import { getSVGDataURI } from "./qr-engine";
import type { Settings } from "./types";
import { DEFAULT_SETTINGS, toLabel } from "./types";

// ─── AI prompt ───────────────────────────────────────────────────────────────

function buildPrompt(description: string): string {
  return `You are a QR code settings extractor. The user described the QR code they want.
Extract the settings and return ONLY a valid JSON object — no markdown, no explanation, just raw JSON.

User description: "${description}"

JSON schema (all fields optional except "url"):
{
  "url": string,             // required: the URL, email, phone number, or text to encode
  "bodyPattern": string,     // shape of each module: square | circle | circle-large | diamond | circle-mixed | pacman | rounded | small-square | vertical-line
  "cornerEyePattern": string,// outer corner shape: square | rounded | gear | circle | diya | extra-rounded | message | pointy | curly
  "cornerEyeDotPattern": string, // inner corner dot: square | rounded | circle | diamond | message | message-reverse | diya | diya-reverse | rounded-triangle | star | banner
  "fgColor": string,         // hex foreground color, e.g. "#000000"
  "bgColor": string,         // hex background color, e.g. "#ffffff"
  "eyeColor": string,        // optional hex override for corner eye outlines
  "dotColor": string,        // optional hex override for corner inner dots
  "templateId": string,      // decorative frame: "" (none) | Arrow | StandardBox | SquareBorder | StrikedBox | Halloween
  "level": string,           // error correction: L | M | Q | H
  "logo": string             // optional logo URL to place in the centre
}

Rules:
- "url" is required; if you cannot identify one, use "" and the user will correct it
- Only include fields that are clearly described
- For colours, convert descriptive names to hex (e.g. "blue" → "#0000ff", "red" → "#e00000")
- If the description implies a "cool" or "modern" look, use circle or rounded patterns
- If the description says "classic" or "standard", use square patterns

Return ONLY the JSON object.`;
}

// ─── Parse AI response ────────────────────────────────────────────────────────

function parseAIResponse(raw: string): Partial<Settings> & { url?: string } {
  try {
    const json = raw.match(/\{[\s\S]*\}/)?.[0] ?? raw;
    return JSON.parse(json);
  } catch {
    return {};
  }
}

function mergeSettings(
  base: Settings,
  ai: Partial<Settings> & { url?: string },
): Settings {
  return {
    ...base,
    ...(ai.bodyPattern
      ? { bodyPattern: ai.bodyPattern as Settings["bodyPattern"] }
      : {}),
    ...(ai.cornerEyePattern
      ? {
          cornerEyePattern: ai.cornerEyePattern as Settings["cornerEyePattern"],
        }
      : {}),
    ...(ai.cornerEyeDotPattern
      ? {
          cornerEyeDotPattern:
            ai.cornerEyeDotPattern as Settings["cornerEyeDotPattern"],
        }
      : {}),
    ...(ai.fgColor ? { fgColor: ai.fgColor } : {}),
    ...(ai.bgColor ? { bgColor: ai.bgColor } : {}),
    ...(ai.eyeColor ? { eyeColor: ai.eyeColor } : {}),
    ...(ai.dotColor ? { dotColor: ai.dotColor } : {}),
    ...(ai.templateId !== undefined ? { templateId: ai.templateId } : {}),
    ...(ai.level ? { level: ai.level as Settings["level"] } : {}),
    ...(ai.logo ? { logo: ai.logo } : {}),
  };
}

// ─── Result view ─────────────────────────────────────────────────────────────

function AIQRResult({
  description,
  onReset,
}: {
  description: string;
  onReset: () => void;
}) {
  const {
    data: rawData,
    isLoading,
    error,
  } = useAI(buildPrompt(description), {
    creativity: 0,
    stream: false,
  });

  const { url, settings } = useMemo(() => {
    if (!rawData) return { url: "", settings: DEFAULT_SETTINGS };
    const parsed = parseAIResponse(rawData);
    return {
      url: parsed.url ?? "",
      settings: mergeSettings(DEFAULT_SETTINGS, parsed),
    };
  }, [rawData]);

  if (error) {
    showToast({
      style: Toast.Style.Failure,
      title: "AI error",
      message: error.message,
    });
    return (
      <Detail
        actions={
          <ActionPanel>
            <Action
              icon={Icon.ArrowClockwise}
              onAction={onReset}
              title="Try Again"
            />
          </ActionPanel>
        }
        markdown={`**AI Error**\n\n${error.message}\n\nPress ⌘R to try again.`}
      />
    );
  }

  if (isLoading || !url) {
    return (
      <Detail
        actions={
          <ActionPanel>
            <Action icon={Icon.XMarkCircle} onAction={onReset} title="Cancel" />
          </ActionPanel>
        }
        isLoading={isLoading}
        markdown={`## Generating QR from description…\n\n> "${description}"`}
      />
    );
  }

  const qrProps = buildQRProps(url, settings);
  const _dataURI = getSVGDataURI(qrProps);

  const _settingsMd = [
    "| Setting | Value |",
    "|---|---|",
    `| **URL** | \`${url}\` |`,
    `| **Body** | ${toLabel(settings.bodyPattern)} |`,
    `| **Corner Eye** | ${toLabel(settings.cornerEyePattern)} |`,
    `| **Corner Dot** | ${toLabel(settings.cornerEyeDotPattern)} |`,
    ...(settings.fgColor !== "#000000"
      ? [`| **Foreground** | \`${settings.fgColor}\` |`]
      : []),
    ...(settings.bgColor !== "#ffffff"
      ? [`| **Background** | \`${settings.bgColor}\` |`]
      : []),
    ...(settings.templateId
      ? [`| **Template** | ${toLabel(settings.templateId)} |`]
      : []),
    ...(settings.logo ? [`| **Logo** | ${settings.logo} |`] : []),
    `| **Error Correction** | ${settings.level} |`,
  ].join("\n");

  return (
    <QRPreview
      onEdit={onReset}
      qrProps={qrProps}
      settings={settings}
      url={url}
    />
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────

export default function AIGenerate() {
  const [description, setDescription] = useState("");
  const [submitted, setSubmitted] = useState("");

  if (submitted) {
    return (
      <AIQRResult description={submitted} onReset={() => setSubmitted("")} />
    );
  }

  const examples = [
    "QR for https://github.com with circle patterns and dark blue color",
    "A modern QR for https://qrdx.dev with rounded style and orange tint",
    "Classic black QR for mailto:hello@example.com",
    "QR for https://myshop.com with Halloween template and orange background",
    "Scan-to-pay QR for https://pay.example.com, high error correction, with logo",
  ];

  return (
    <List
      actions={
        <ActionPanel>
          {description.trim() && (
            <Action
              icon={Icon.Wand}
              onAction={() => setSubmitted(description.trim())}
              title="Generate QR Code"
            />
          )}
        </ActionPanel>
      }
      navigationTitle="AI Generate QR Code"
      onSearchTextChange={setDescription}
      searchBarPlaceholder="Describe the QR code you want…"
      searchText={description}
    >
      {description.trim() ? (
        <List.Item
          actions={
            <ActionPanel>
              <Action
                icon={Icon.Wand}
                onAction={() => setSubmitted(description.trim())}
                title="Generate QR Code with AI"
              />
            </ActionPanel>
          }
          icon={Icon.Wand}
          subtitle="Press ↵ to generate with AI"
          title={`Generate: "${description}"`}
        />
      ) : (
        <List.Section title="Examples — press ↵ on any to try it">
          {examples.map((ex) => (
            <List.Item
              actions={
                <ActionPanel>
                  <Action
                    icon={Icon.Wand}
                    onAction={() => setSubmitted(ex)}
                    title="Use This Example"
                  />
                </ActionPanel>
              }
              icon={Icon.LightBulb}
              key={ex}
              title={ex}
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}
