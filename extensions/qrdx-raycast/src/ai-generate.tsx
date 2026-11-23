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
import { DEFAULT_FRAME_TEXT, FRAME_TEXT_MAX_LENGTH } from "qrdx";
import { useMemo, useState } from "react";
import {
  capFrameText,
  describeFrames,
  IMPLIED_FRAME,
  resolveFrame,
} from "./frames";
import { QRPreview } from "./generate-qr";
import { buildQRProps } from "./qr-engine";
import type { Settings } from "./types";
import {
  BODY_PATTERNS,
  CORNER_DOT_PATTERNS,
  CORNER_EYE_PATTERNS,
  DEFAULT_SETTINGS,
} from "./types";

// ─── AI prompt ───────────────────────────────────────────────────────────────

const options = (list: readonly string[]) => list.join(" | ");

function buildPrompt(description: string): string {
  return `You are a QR code settings extractor. The user described the QR code they want.
Extract the settings and return ONLY a valid JSON object — no markdown, no explanation, just raw JSON.

User description: "${description}"

JSON schema (all fields optional except "url"):
{
  "url": string,             // required: the URL, email, phone number, or text to encode
  "bodyPattern": string,     // shape of each module: ${options(BODY_PATTERNS)}
  "cornerEyePattern": string,// outer corner shape: ${options(CORNER_EYE_PATTERNS)}
  "cornerEyeDotPattern": string, // inner corner dot: ${options(CORNER_DOT_PATTERNS)}
  "fgColor": string,         // hex foreground color, e.g. "#000000"
  "bgColor": string,         // hex background color, e.g. "#ffffff"
  "eyeColor": string,        // optional hex override for corner eye outlines
  "dotColor": string,        // optional hex override for corner inner dots
  "frame": string,           // call-to-action frame around the code: "" (none) or a style from this list (names in brackets): ${describeFrames()}
  "frameText": string,       // the frame's label, up to ${FRAME_TEXT_MAX_LENGTH} characters (default "${DEFAULT_FRAME_TEXT}"; "" for none)
  "frameColor": string,      // optional hex color of the frame
  "frameTextColor": string,  // optional hex color of the frame's label
  "level": string,           // error correction: L | M | Q | H
  "logo": string             // optional logo URL to place in the center
}

Rules:
- "url" is required; if you cannot identify one, use "" and the user will correct it
- Only include fields that are clearly described
- For colors, convert descriptive names to hex (e.g. "blue" → "#0000ff", "red" → "#e00000")
- If the description implies a "cool" or "modern" look, use circle or rounded patterns
- If the description says "classic" or "standard", use square patterns
- If the description asks for a label or a call to action ("Scan me", "Scan for the menu") but names no frame, use "${IMPLIED_FRAME}"

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

/**
 * The frame settings in the AI's answer: known frames only, labels capped. A
 * label or frame color without a known frame implies one, as in qrdx's CLI.
 */
function frameSettings(ai: Partial<Settings>): Partial<Settings> {
  const text = typeof ai.frameText === "string" ? ai.frameText : undefined;
  const implied = text || ai.frameColor || ai.frameTextColor;
  const frame = resolveFrame(ai.frame) || (implied ? IMPLIED_FRAME : "");
  if (!frame) return {};
  return {
    frame,
    ...(text === undefined ? {} : { frameText: capFrameText(text) }),
    ...(ai.frameColor ? { frameColor: ai.frameColor } : {}),
    ...(ai.frameTextColor ? { frameTextColor: ai.frameTextColor } : {}),
  };
}

function mergeSettings(
  base: Settings,
  ai: Partial<Settings> & { url?: string }
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
    ...frameSettings(ai),
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
    'QR for https://myshop.com in an orange frame that says "Shop now"',
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
