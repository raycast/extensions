// Views of the dynamic codes in a QRdx workspace: the API key prompt, a
// code's actions and details, its scans, and the forms that create and edit
// codes. Dynamic QR Codes and Create Dynamic QR Code are built from these.

import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { join } from "node:path";
import {
  Action,
  ActionPanel,
  Color,
  Detail,
  Form,
  Icon,
  Keyboard,
  List,
  openExtensionPreferences,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useForm, usePromise } from "@raycast/utils";
import { useState } from "react";
import { copyPNG, copySVG, savePNG, saveSVG } from "./code-exports";
import { dynamicCodeRenderProps } from "./code-style";
import { SAVE_PNG_SHORTCUT, SAVE_SVG_SHORTCUT } from "./generate-qr";
import { cacheDir, codeSVG, drawPNG, previewMarkdown } from "./preview-files";
import { type QRRenderProps, withLogoData, withoutRemoteLogo } from "./qr-engine";
import {
  API_KEYS_DOCS_URL,
  CREATE_API_KEY_URL,
  codeName,
  createCode,
  type DynamicCode,
  dashboardLink,
  destinationError,
  getScans,
  SCAN_RANGES,
  type ScanAnalytics,
  type ScanRange,
  updateCode,
} from "./qrdx-api";

export const COPY_LINK_SHORTCUT: Keyboard.Shortcut = { modifiers: ["cmd"], key: "l" };

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatCount(count: number): string {
  return count.toLocaleString("en-US");
}

function scansText(count: number): string {
  return `${formatCount(count)} scan${count === 1 ? "" : "s"}`;
}

/** The file names a code is saved under: qrdx-<its slug>-<time>. */
function filePrefix(code: DynamicCode): string {
  return `qrdx-${code.slug.replace(/[^\w-]/g, "")}`;
}

// ─── Without an API key ───────────────────────────────────────────────────────

function ApiKeyActions() {
  return (
    <ActionPanel>
      <Action icon={Icon.Key} onAction={openExtensionPreferences} title="Add API Key" />
      <Action.OpenInBrowser icon={Icon.Globe} title="Create API Key in QRdx" url={CREATE_API_KEY_URL} />
      <Action.OpenInBrowser icon={Icon.Book} title="Read About API Keys" url={API_KEYS_DOCS_URL} />
    </ActionPanel>
  );
}

/** What the account commands show until an API key is set. */
export function ApiKeyRequired() {
  return (
    <List>
      <List.EmptyView
        actions={<ApiKeyActions />}
        description="Dynamic codes live in your QRdx account. Create an API key in QRdx (Settings → API keys & apps; every plan has them, Free included) and paste it into this extension's preferences."
        icon={Icon.Key}
        title="Add Your QRdx API Key"
      />
    </List>
  );
}

/** A failed request, with a way to try again or fix the key. */
export function ApiErrorView({ error, onRetry }: { error: Error; onRetry: () => void }) {
  return (
    <List.EmptyView
      actions={
        <ActionPanel>
          <Action icon={Icon.ArrowClockwise} onAction={onRetry} title="Try Again" />
          <Action icon={Icon.Key} onAction={openExtensionPreferences} title="Change API Key" />
        </ActionPanel>
      }
      description={error.message}
      icon={Icon.Warning}
      title="Could Not Reach QRdx"
    />
  );
}

// ─── Previews ─────────────────────────────────────────────────────────────────

// The list's icons and detail pane show these, the pane at 150 pt, so they're
// drawn at 512 px to stay sharp on a Retina screen.
const LIST_PREVIEW_PIXELS = 512;
export const DETAIL_PREVIEW_POINTS = 150;

function previewDir(): string {
  return cacheDir("dynamic-previews", LIST_PREVIEW_PIXELS);
}

/** A code's preview file: named by what it draws, so a new design gets a new file. */
export function dynamicPreviewPath(code: DynamicCode): string {
  const drawn = JSON.stringify({ link: code.shortLink, style: code.style });
  const hash = createHash("sha256").update(drawn).digest("hex").slice(0, 16);
  return join(previewDir(), `${code.id.replace(/[^\w-]/g, "")}-${hash}.png`);
}

/**
 * Draws the previews `codes` are missing, one at a time; `onDrawn` runs
 * after each so the list can show it. A code whose logo can't be loaded is
 * drawn without it.
 */
export async function drawDynamicPreviews(codes: DynamicCode[], onDrawn: () => void): Promise<void> {
  for (const code of codes) {
    const path = dynamicPreviewPath(code);
    if (existsSync(path)) continue;
    const props = dynamicCodeRenderProps(code, LIST_PREVIEW_PIXELS);
    try {
      const drawable = await withLogoData(props).catch(() => withoutRemoteLogo(props));
      await drawPNG(codeSVG(drawable, LIST_PREVIEW_PIXELS), path, LIST_PREVIEW_PIXELS);
      onDrawn();
    } catch {
      /* left without a preview; the list shows an icon */
    }
  }
}

// ─── A code's details ─────────────────────────────────────────────────────────

/** A code's link, destination, scans and dates, as Detail metadata. */
export function DynamicCodeMetadata({ Metadata, code }: { Metadata: typeof Detail.Metadata; code: DynamicCode }) {
  return (
    <Metadata>
      <Metadata.Link target={code.shortLink} text={code.shortLink.replace(/^https?:\/\//, "")} title="Short Link" />
      {code.kind === "page" ? (
        <Metadata.Label text="A hosted page (edit it in QRdx)" title="Opens" />
      ) : code.destinationUrl ? (
        <Metadata.Link target={code.destinationUrl} text={code.destinationUrl} title="Opens" />
      ) : null}
      {code.status === "active" ? null : (
        <Metadata.TagList title="Status">
          <Metadata.TagList.Item
            color={Color.Orange}
            text={code.status === "archived" ? "Archived: not redirecting" : "Disabled: over the plan's limit"}
          />
        </Metadata.TagList>
      )}
      <Metadata.Separator />
      <Metadata.Label icon={Icon.BarChart} text={formatCount(code.scanCount)} title="Scans" />
      <Metadata.Label
        text={code.lastScannedAt ? formatDate(code.lastScannedAt) : "Not scanned yet"}
        title="Last Scan"
      />
      <Metadata.Label text={formatDate(code.createdAt)} title="Created" />
    </Metadata>
  );
}

/**
 * Everything a dynamic code offers, as action panel sections, in the list
 * and in its own view.
 */
export function DynamicCodeActions({
  apiKey,
  code,
  onChange,
  showDetails,
}: {
  apiKey: string;
  code: DynamicCode;
  /** Runs with the code after it was edited */
  onChange?: (code: DynamicCode) => void;
  /** Offers the code's own view first (in the list) */
  showDetails?: boolean;
}) {
  const props = dynamicCodeRenderProps(code);
  return (
    <>
      <ActionPanel.Section>
        {showDetails ? (
          <Action.Push
            icon={Icon.Eye}
            target={<DynamicCodeDetail apiKey={apiKey} initialCode={code} onChange={onChange} />}
            title="Show QR Code"
          />
        ) : null}
        <Action.Push icon={Icon.BarChart} target={<ScansView apiKey={apiKey} code={code} />} title="Show Scans" />
        {code.kind === "redirect" ? (
          <Action.Push
            icon={Icon.Pencil}
            shortcut={Keyboard.Shortcut.Common.Edit}
            target={<EditCodeForm apiKey={apiKey} code={code} onSaved={onChange} />}
            title="Change Destination"
          />
        ) : null}
        <Action.CopyToClipboard content={code.shortLink} shortcut={COPY_LINK_SHORTCUT} title="Copy Short Link" />
      </ActionPanel.Section>
      <ActionPanel.Section title="Copy">
        <Action
          icon={Icon.Clipboard}
          onAction={() => copyPNG(props, filePrefix(code))}
          shortcut={{ modifiers: ["cmd"], key: "c" }}
          title="Copy PNG to Clipboard"
        />
        <Action
          icon={Icon.Clipboard}
          onAction={() => copySVG(props)}
          shortcut={Keyboard.Shortcut.Common.Copy}
          title="Copy SVG to Clipboard"
        />
      </ActionPanel.Section>
      <ActionPanel.Section title="Export">
        <Action
          icon={Icon.Download}
          onAction={() => savePNG(props, filePrefix(code))}
          shortcut={SAVE_PNG_SHORTCUT}
          title="Save PNG to Downloads"
        />
        <Action
          icon={Icon.Download}
          onAction={() => saveSVG(props, filePrefix(code))}
          shortcut={SAVE_SVG_SHORTCUT}
          title="Save SVG to Downloads"
        />
      </ActionPanel.Section>
      <ActionPanel.Section title="QRdx">
        <Action.OpenInBrowser
          icon={Icon.Globe}
          shortcut={Keyboard.Shortcut.Common.Open}
          title="Open in QRdx"
          url={dashboardLink(code.id)}
        />
        {code.kind === "redirect" && code.destinationUrl ? (
          <Action.OpenInBrowser icon={Icon.Link} title="Open Destination" url={code.destinationUrl} />
        ) : null}
      </ActionPanel.Section>
    </>
  );
}

/** A code drawn large, with its metadata and actions. */
export function DynamicCodeDetail({
  apiKey,
  initialCode,
  onChange,
}: {
  apiKey: string;
  initialCode: DynamicCode;
  onChange?: (code: DynamicCode) => void;
}) {
  const [code, setCode] = useState(initialCode);
  const props: QRRenderProps = dynamicCodeRenderProps(code);
  const { data: drawable, isLoading } = usePromise(withLogoData, [props], {
    failureToastOptions: { title: "Couldn't load the code's logo" },
  });
  const markdown = drawable ? previewMarkdown(drawable) : isLoading ? "" : previewMarkdown(withoutRemoteLogo(props));

  function changed(next: DynamicCode) {
    setCode(next);
    onChange?.(next);
  }

  return (
    <Detail
      actions={
        <ActionPanel title={codeName(code)}>
          <DynamicCodeActions apiKey={apiKey} code={code} onChange={changed} />
        </ActionPanel>
      }
      isLoading={isLoading}
      markdown={markdown}
      metadata={<DynamicCodeMetadata code={code} Metadata={Detail.Metadata} />}
      navigationTitle={codeName(code)}
    />
  );
}

// ─── Scans ────────────────────────────────────────────────────────────────────

const RANGE_TITLES: Record<ScanRange, string> = {
  "7d": "Last 7 Days",
  "30d": "Last 30 Days",
  "90d": "Last 90 Days",
  "365d": "Last 12 Months",
  all: "All Time",
};

const regionNames = new Intl.DisplayNames(["en"], { type: "region" });

/** A country's name from its two-letter code; the code itself if unknown. */
function countryName(code: string | null): string {
  if (!code) return "Unknown";
  try {
    return regionNames.of(code.toUpperCase()) ?? code;
  } catch {
    return code;
  }
}

const BARS = "▁▂▃▄▅▆▇█";
/** The most bars a row shows; longer series are added up into fewer bars. */
const MAX_BARS = 60;

/** The series as a row of bars, oldest first; empty without scans. */
function sparkline(series: { count: number }[]): string {
  const per = Math.max(1, Math.ceil(series.length / MAX_BARS));
  const counts: number[] = [];
  for (let start = 0; start < series.length; start += per) {
    counts.push(series.slice(start, start + per).reduce((sum, point) => sum + point.count, 0));
  }
  const max = Math.max(0, ...counts);
  if (max === 0) return "";
  return counts
    .map((count) => (count === 0 ? " " : BARS[Math.min(BARS.length - 1, Math.floor((count / max) * BARS.length))]))
    .join("");
}

/** A Markdown table of the top rows of a breakdown. */
function table(title: string, rows: { label: string; count: number }[]): string {
  if (rows.length === 0) return "";
  const lines = rows.slice(0, 5).map((row) => `| ${row.label.replace(/\|/g, "\\|")} | ${formatCount(row.count)} |`);
  return [`| ${title} | Scans |`, "| --- | ---: |", ...lines].join("\n");
}

function label(value: string | null): string {
  return value?.trim() || "Unknown";
}

export function scansMarkdown(code: DynamicCode, analytics: ScanAnalytics): string {
  const range = RANGE_TITLES[analytics.range as ScanRange] ?? analytics.range;
  const bars = sparkline(analytics.series);
  const parts = [
    `# ${codeName(code)}`,
    `**${scansText(analytics.total)}** from ${formatCount(analytics.unique)} unique visitor${analytics.unique === 1 ? "" : "s"} · ${range}`,
    bars
      ? `Scans from ${formatDate(analytics.from)} to today:\n\n\`\`\`\n${bars}\n\`\`\``
      : "No scans in this range yet.",
    table(
      "Country",
      analytics.countries.map((row) => ({ label: countryName(row.value), count: row.count }))
    ),
    table(
      "City",
      analytics.cities.map((row) => ({
        label: row.city ? `${row.city}${row.country ? `, ${countryName(row.country)}` : ""}` : "Unknown",
        count: row.count,
      }))
    ),
    table(
      "Device",
      analytics.devices.map((row) => ({ label: label(row.value), count: row.count }))
    ),
    table(
      "Operating System",
      analytics.os.map((row) => ({ label: label(row.value), count: row.count }))
    ),
    table(
      "Browser",
      analytics.browsers.map((row) => ({ label: label(row.value), count: row.count }))
    ),
    table(
      "Referrer",
      analytics.referrers.map((row) => ({ label: label(row.value), count: row.count }))
    ),
  ];
  if (analytics.retentionDays !== null && analytics.range !== "all") {
    parts.push(`_Your plan keeps ${formatCount(analytics.retentionDays)} days of scan history._`);
  }
  return parts.filter(Boolean).join("\n\n");
}

/** A code's scan analytics for a range, chosen from the actions. */
export function ScansView({ apiKey, code }: { apiKey: string; code: DynamicCode }) {
  const [range, setRange] = useState<ScanRange>("30d");
  const { data, isLoading, error, revalidate } = usePromise(getScans, [apiKey, code.id, range], {
    failureToastOptions: { title: "Could not load the scans" },
  });

  const markdown = data ? scansMarkdown(code, data) : error ? `# Could not load the scans\n\n${error.message}` : "";

  return (
    <Detail
      actions={
        <ActionPanel>
          <ActionPanel.Submenu
            icon={Icon.Calendar}
            shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
            title="Change Range"
          >
            {SCAN_RANGES.map((key) => (
              <Action
                icon={key === range ? Icon.CheckCircle : Icon.Circle}
                key={key}
                onAction={() => setRange(key)}
                title={RANGE_TITLES[key]}
              />
            ))}
          </ActionPanel.Submenu>
          <Action
            icon={Icon.ArrowClockwise}
            onAction={revalidate}
            shortcut={Keyboard.Shortcut.Common.Refresh}
            title="Refresh"
          />
          <Action.OpenInBrowser
            icon={Icon.Globe}
            shortcut={Keyboard.Shortcut.Common.Open}
            title="Open in QRdx"
            url={dashboardLink(code.id)}
          />
        </ActionPanel>
      }
      isLoading={isLoading}
      markdown={markdown}
      navigationTitle={`Scans: ${codeName(code)}`}
    />
  );
}

// ─── Forms ────────────────────────────────────────────────────────────────────

/** Change where a code sends people, and its title. Its short link stays. */
export function EditCodeForm({
  apiKey,
  code,
  onSaved,
}: {
  apiKey: string;
  code: DynamicCode;
  onSaved?: (code: DynamicCode) => void;
}) {
  const { pop } = useNavigation();
  const { handleSubmit, itemProps } = useForm<{ destinationUrl: string; title: string }>({
    initialValues: { destinationUrl: code.destinationUrl ?? "", title: code.title ?? "" },
    validation: { destinationUrl: (value) => destinationError(value ?? "") },
    async onSubmit(values) {
      const toast = await showToast({ style: Toast.Style.Animated, title: "Saving…" });
      try {
        const title = values.title.trim();
        const updated = await updateCode(apiKey, code.id, {
          destinationUrl: values.destinationUrl.trim(),
          ...(title === (code.title ?? "") ? {} : { title }),
        });
        toast.style = Toast.Style.Success;
        toast.title = "Destination changed";
        toast.message = `${updated.shortLink} now opens ${updated.destinationUrl ?? "its page"}`;
        onSaved?.(updated);
        pop();
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = "Could not save the code";
        toast.message = error instanceof Error ? error.message : String(error);
      }
    },
  });

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.Check} onSubmit={handleSubmit} title="Save" />
        </ActionPanel>
      }
      navigationTitle={`Edit ${codeName(code)}`}
    >
      <Form.Description text={`The code keeps its link, ${code.shortLink}, so printed copies open the new address.`} />
      <Form.TextField {...itemProps.destinationUrl} placeholder="https://example.com/spring-menu" title="Destination" />
      <Form.TextField {...itemProps.title} placeholder="Spring menu" title="Title" />
    </Form>
  );
}

/** A new dynamic code, with the workspace's default design. */
export function CreateCodeForm({ apiKey, onCreated }: { apiKey: string; onCreated?: (code: DynamicCode) => void }) {
  const { push } = useNavigation();
  const { handleSubmit, itemProps } = useForm<{ destinationUrl: string; title: string }>({
    initialValues: { destinationUrl: "", title: "" },
    validation: { destinationUrl: (value) => destinationError(value ?? "") },
    async onSubmit(values) {
      const toast = await showToast({ style: Toast.Style.Animated, title: "Creating code…" });
      try {
        const code = await createCode(apiKey, { destinationUrl: values.destinationUrl, title: values.title });
        toast.style = Toast.Style.Success;
        toast.title = "Code created";
        toast.message = code.shortLink;
        onCreated?.(code);
        push(<DynamicCodeDetail apiKey={apiKey} initialCode={code} />);
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = "Could not create the code";
        toast.message = error instanceof Error ? error.message : String(error);
      }
    },
  });

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.Plus} onSubmit={handleSubmit} title="Create Code" />
          <Action.OpenInBrowser
            icon={Icon.Book}
            title="Read About Dynamic Codes"
            url="https://qrdx.dev/docs/dynamic-qr-codes"
          />
        </ActionPanel>
      }
    >
      <Form.Description text="A dynamic code opens a short link you can point somewhere else later, and counts its scans. It gets your workspace's default design." />
      <Form.TextField {...itemProps.destinationUrl} placeholder="https://example.com/spring-menu" title="Destination" />
      <Form.TextField
        {...itemProps.title}
        info="Optional. Shown in your list of codes."
        placeholder="Spring menu"
        title="Title"
      />
    </Form>
  );
}
