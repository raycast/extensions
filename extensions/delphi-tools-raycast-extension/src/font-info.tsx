import { execFileAsync, getDelphitoolsCliPath } from "./utils/exec";
import {
  Action,
  ActionPanel,
  Clipboard,
  Detail,
  Form,
  Icon,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import path from "node:path";

import { DelphitoolsRequired } from "./delphitools-install";

const SUPPORTED_EXTENSIONS = new Set([".ttf", ".otf", ".woff", ".woff2"]);
const SUMMARY_KEYS = [
  "family",
  "fontFamily",
  "familyName",
  "style",
  "subfamily",
  "subfamilyName",
  "fullName",
  "name",
  "version",
];

type FormValues = {
  font: string[];
};

type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

type FontInfoResult = {
  fontPath: string;
  metadata: JsonValue;
  rawJson: string;
};

export default function Command() {
  return (
    <DelphitoolsRequired>
      {({ isCheckingInstall }) => (
        <FontInfoForm isCheckingInstall={isCheckingInstall} />
      )}
    </DelphitoolsRequired>
  );
}

function FontInfoForm({ isCheckingInstall }: { isCheckingInstall: boolean }) {
  const { push } = useNavigation();

  return (
    <Form
      isLoading={isCheckingInstall}
      actions={
        <ActionPanel>
          <Action.SubmitForm<FormValues>
            icon={Icon.Text}
            title="Font File Explorer"
            onSubmit={async (values) => {
              const validationError = validateFontSelection(values.font);

              if (validationError) {
                await showToast({
                  style: Toast.Style.Failure,
                  title: validationError,
                });
                return;
              }

              try {
                const result = await runFontInfo(values.font[0]);

                push(<FontInfoDetail result={result} />);
              } catch (error) {
                const message =
                  error instanceof Error ? error.message : String(error);

                await showToast({
                  style: Toast.Style.Failure,
                  title: "Could not read font metadata",
                  message,
                });
              }
            }}
          />
        </ActionPanel>
      }
    >
      <Form.FilePicker
        id="font"
        title="Font"
        allowMultipleSelection={false}
        canChooseDirectories={false}
      />
      <Form.Description text="Choose one TTF, OTF, WOFF, or WOFF2 font file." />
    </Form>
  );
}

function FontInfoDetail({ result }: { result: FontInfoResult }) {
  const summary = formatConciseSummary(result);

  return (
    <Detail
      markdown={formatMetadataMarkdown(result)}
      actions={
        <ActionPanel>
          <Action
            icon={Icon.Clipboard}
            title="Copy Font Metadata JSON"
            onAction={async () => {
              await Clipboard.copy(result.rawJson);
              await showToast({
                style: Toast.Style.Success,
                title: "Copied Font Metadata JSON",
              });
            }}
          />
          <Action.CopyToClipboard
            icon={Icon.Text}
            title="Copy Font Summary"
            content={summary}
            shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
          />
          <Action.ShowInFinder
            title="Reveal in Finder"
            path={result.fontPath}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
          />
        </ActionPanel>
      }
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label
            title="File"
            text={path.basename(result.fontPath)}
          />
          <Detail.Metadata.Label
            title="Format"
            text={path.extname(result.fontPath).slice(1).toUpperCase()}
          />
          <Detail.Metadata.Label title="Path" text={result.fontPath} />
        </Detail.Metadata>
      }
    />
  );
}

async function runFontInfo(fontPath: string): Promise<FontInfoResult> {
  const { stdout } = await execFileAsync(getDelphitoolsCliPath(), [
    "font-info",
    "--json",
    "--quiet",
    fontPath,
  ]);
  const rawJson = stdout.trim();

  if (!rawJson) {
    throw new Error("delphitools returned empty metadata.");
  }

  try {
    const metadata = JSON.parse(rawJson) as JsonValue;

    return {
      fontPath,
      metadata,
      rawJson: JSON.stringify(metadata, null, 2),
    };
  } catch {
    throw new Error("delphitools returned invalid JSON.");
  }
}

function validateFontSelection(fonts?: string[]): string | null {
  if (!fonts?.length) {
    return "Choose a font file";
  }

  if (fonts.length > 1) {
    return "Choose only one font file";
  }

  const extension = path.extname(fonts[0]).toLowerCase();

  if (!SUPPORTED_EXTENSIONS.has(extension)) {
    return "Choose a TTF, OTF, WOFF, or WOFF2 file";
  }

  return null;
}

function formatMetadataMarkdown(result: FontInfoResult): string {
  const title =
    findFirstString(result.metadata, ["fullName", "name", "family"]) ||
    path.basename(result.fontPath);
  const summaryRows = getSummaryEntries(result.metadata).map(
    ({ label, value }) => `- **${label}:** ${escapeMarkdown(value)}`,
  );
  const unknownMarkdown = formatJsonValue(result.metadata, 3);

  return `# ${escapeMarkdown(title)}

## Summary

${summaryRows.length ? summaryRows.join("\n") : "- No common summary fields found."}
- **Source:** \`${escapeBackticks(result.fontPath)}\`

## Metadata

${unknownMarkdown}
`;
}

function formatConciseSummary(result: FontInfoResult): string {
  const rows = getSummaryEntries(result.metadata).map(
    ({ label, value }) => `${label}: ${value}`,
  );

  return [...rows, `Source: ${result.fontPath}`].join("\n");
}

function getSummaryEntries(metadata: JsonValue): Array<{
  label: string;
  value: string;
}> {
  const entries = SUMMARY_KEYS.flatMap((key) => {
    const value = findFirstString(metadata, [key]);

    return value ? [{ label: labelize(key), value }] : [];
  });
  const seen = new Set<string>();

  return entries.filter((entry) => {
    const key = `${entry.label}:${entry.value}`;

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function findFirstString(value: JsonValue, keys: string[]): string | undefined {
  if (!isRecord(value)) {
    if (Array.isArray(value)) {
      for (const item of value) {
        const nested = findFirstString(item, keys);

        if (nested) {
          return nested;
        }
      }
    }

    return undefined;
  }

  for (const key of keys) {
    const directValue = value[key];

    if (
      typeof directValue === "string" ||
      typeof directValue === "number" ||
      typeof directValue === "boolean"
    ) {
      return String(directValue);
    }
  }

  for (const nestedValue of Object.values(value)) {
    const nested = findFirstString(nestedValue, keys);

    if (nested) {
      return nested;
    }
  }

  return undefined;
}

function formatJsonValue(value: JsonValue, headingLevel: number): string {
  if (Array.isArray(value)) {
    if (value.length === 0) {
      return "_Empty array_";
    }

    if (value.every(isScalar)) {
      return value.map((item) => `- ${formatScalar(item)}`).join("\n");
    }

    return value
      .map((item, index) => {
        const heading = "#".repeat(Math.min(headingLevel, 6));

        return `${heading} Item ${index + 1}\n\n${formatJsonValue(item, headingLevel + 1)}`;
      })
      .join("\n\n");
  }

  if (!isRecord(value)) {
    return formatScalar(value);
  }

  const entries = Object.entries(value);

  if (entries.length === 0) {
    return "_No fields_";
  }

  return entries
    .map(([key, entryValue]) => {
      if (!isRecord(entryValue) && !Array.isArray(entryValue)) {
        return `- **${escapeMarkdown(labelize(key))}:** ${formatScalar(entryValue)}`;
      }

      const heading = "#".repeat(Math.min(headingLevel, 6));

      return `${heading} ${escapeMarkdown(labelize(key))}\n\n${formatJsonValue(entryValue, headingLevel + 1)}`;
    })
    .join("\n\n");
}

function formatScalar(value: string | number | boolean | null): string {
  if (value === null) {
    return "`null`";
  }

  if (typeof value === "string") {
    return value.trim() ? escapeMarkdown(value) : "_Empty_";
  }

  return `\`${String(value)}\``;
}

function isScalar(value: JsonValue): value is string | number | boolean | null {
  return !isRecord(value) && !Array.isArray(value);
}

function isRecord(value: JsonValue): value is { [key: string]: JsonValue } {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function labelize(key: string): string {
  return key
    .replace(/[_-]+/g, " ")
    .replace(/([a-z\d])([A-Z])/g, "$1 $2")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function escapeMarkdown(value: string): string {
  return value.replace(/([\\`*_{}[\]()#+.!|>-])/g, "\\$1");
}

function escapeBackticks(value: string): string {
  return value.replace(/`/g, "\\`");
}
