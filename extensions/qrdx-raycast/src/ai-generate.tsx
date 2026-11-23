import { Action, ActionPanel, AI, Detail, environment, Icon, Keyboard, List, useNavigation } from "@raycast/api";
import { useAI } from "@raycast/utils";
import { DEFAULT_FRAME_TEXT, FRAME_TEXT_MAX_LENGTH } from "qrdx";
import { useMemo, useState } from "react";
import { capFrameText, describeFrames, IMPLIED_FRAME, resolveFrame } from "./frames";
import { QREditor, QRPreview } from "./generate-qr";
import { buildQRProps } from "./qr-engine";
import type { Settings } from "./types";
import { BODY_PATTERNS, CORNER_DOT_PATTERNS, CORNER_EYE_PATTERNS, DEFAULT_SETTINGS } from "./types";

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

function mergeSettings(base: Settings, ai: Partial<Settings> & { url?: string }): Settings {
  return {
    ...base,
    ...(ai.bodyPattern ? { bodyPattern: ai.bodyPattern as Settings["bodyPattern"] } : {}),
    ...(ai.cornerEyePattern
      ? {
          cornerEyePattern: ai.cornerEyePattern as Settings["cornerEyePattern"],
        }
      : {}),
    ...(ai.cornerEyeDotPattern
      ? {
          cornerEyeDotPattern: ai.cornerEyeDotPattern as Settings["cornerEyeDotPattern"],
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

/** Opens Generate QR's form, as the way to make a code without the AI. */
function ManualEditorAction({ title, initialSettings }: { title: string; initialSettings?: Settings }) {
  return (
    <Action.Push
      icon={Icon.Code}
      target={<QREditor initialSettings={initialSettings} navigationTitle="Generate QR" />}
      title={title}
    />
  );
}

/**
 * The code Raycast AI sets up from `description`, pushed over the
 * description list. Esc, Cancel and Revise Description go back to it.
 */
function AIQRResult({ description }: { description: string }) {
  const { pop } = useNavigation();
  const {
    data: rawData,
    isLoading,
    error,
    revalidate,
  } = useAI(buildPrompt(description), {
    creativity: 0,
    stream: false,
    // useAI shows this when the request fails, with a Retry action.
    failureToastOptions: { title: "Raycast AI couldn't set up the code" },
  });

  const { url, settings } = useMemo(() => {
    if (!rawData) return { url: "", settings: DEFAULT_SETTINGS };
    const parsed = parseAIResponse(rawData);
    return {
      url: typeof parsed.url === "string" ? parsed.url.trim() : "",
      settings: mergeSettings(DEFAULT_SETTINGS, parsed),
    };
  }, [rawData]);

  const revise = <Action icon={Icon.Pencil} onAction={pop} title="Revise Description" />;

  if (isLoading) {
    return (
      <Detail
        actions={
          <ActionPanel>
            <Action icon={Icon.XMarkCircle} onAction={pop} title="Cancel" />
          </ActionPanel>
        }
        isLoading
        markdown={`## Generating QR from description…\n\n> "${description}"`}
      />
    );
  }

  // Checked after isLoading: a retry keeps the last error until it ends.
  if (error) {
    return (
      <Detail
        actions={
          <ActionPanel>
            <Action
              icon={Icon.ArrowClockwise}
              onAction={revalidate}
              shortcut={Keyboard.Shortcut.Common.Refresh}
              title="Try Again"
            />
            {revise}
            <ManualEditorAction title="Generate QR Without AI" />
          </ActionPanel>
        }
        markdown={`## Raycast AI couldn't set up the code\n\n${error.message}\n\nTry again, revise the description, or make the code yourself with Generate QR.`}
      />
    );
  }

  if (!url) {
    // The description doesn't name what to encode (the prompt allows an
    // empty "url"): ask for it, keeping the style the AI chose.
    return (
      <Detail
        actions={
          <ActionPanel>
            <ManualEditorAction initialSettings={settings} title="Enter Data…" />
            {revise}
          </ActionPanel>
        }
        markdown={`## What should the code hold?\n\nThe description doesn't say what to encode, such as a link, an email address, a phone number or some text.\n\n> "${description}"\n\nEnter the data in Generate QR's form, which opens with the style from your description, or revise the description.`}
      />
    );
  }

  return <QRPreview onEdit={pop} qrProps={buildQRProps(url, settings)} settings={settings} url={url} />;
}

// ─── Without Raycast AI ───────────────────────────────────────────────────────

function NoAIAccess() {
  return (
    <Detail
      actions={
        <ActionPanel>
          <ManualEditorAction title="Generate QR Without AI" />
        </ActionPanel>
      }
      markdown={
        "## This command needs Raycast AI\n\nGenerate QR with AI asks Raycast AI to turn your description into a code's settings, and your Raycast account doesn't have access to Raycast AI.\n\n**Generate QR** makes the same codes without AI: you pick the patterns, colors and frame yourself. Press ↵ to open it."
      }
    />
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────

export default function AIGenerate() {
  const [description, setDescription] = useState("");

  if (!environment.canAccess(AI)) {
    return <NoAIAccess />;
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
            <Action.Push
              icon={Icon.Wand}
              target={<AIQRResult description={description.trim()} />}
              title="Generate QR Code"
            />
          )}
        </ActionPanel>
      }
      onSearchTextChange={setDescription}
      searchBarPlaceholder="Describe the QR code you want…"
      searchText={description}
    >
      {description.trim() ? (
        <List.Item
          actions={
            <ActionPanel>
              <Action.Push
                icon={Icon.Wand}
                target={<AIQRResult description={description.trim()} />}
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
                  <Action.Push icon={Icon.Wand} target={<AIQRResult description={ex} />} title="Use This Example" />
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
