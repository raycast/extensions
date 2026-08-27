import {
  Action,
  ActionPanel,
  Alert,
  Clipboard,
  Color,
  Detail,
  Form,
  Icon,
  List,
  Toast,
  confirmAlert,
  showToast,
  useNavigation,
  Keyboard,
} from "@raycast/api";
import { useCachedPromise, usePromise } from "@raycast/utils";
import { useState } from "react";
import type { BreakdownRow, DynamicCode, ScansResponse } from "@open-qr/sdk";
import { client, errorMessage, renderQrPng, safeName } from "./openqr";

export default function Command() {
  const {
    data: codes,
    isLoading,
    revalidate,
    error,
  } = useCachedPromise(
    async () => client().listDynamicCodes({ limit: 200 }),
    [],
    {
      onError: (e) => {
        void showToast({
          style: Toast.Style.Failure,
          title: "Failed to load codes",
          message: errorMessage(e),
        });
      },
    },
  );

  // Only the selected code renders its QR. Every List.Item mounts, so rendering per item
  // would fire one API call per code in the account on open.
  const [selectedId, setSelectedId] = useState<string | null>(null);

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={(codes ?? []).length > 0}
      onSelectionChange={setSelectedId}
      searchBarPlaceholder="Filter by label, slug or destination…"
    >
      {error ? (
        // A failed load must never read as an empty account: the two need opposite
        // remedies (fix the key or network vs create a code), so the error itself goes
        // on the list, with a retry one keystroke away.
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="Couldn’t load dynamic codes"
          description={errorMessage(error)}
          actions={
            <ActionPanel>
              <Action
                title="Retry"
                icon={Icon.ArrowClockwise}
                shortcut={Keyboard.Shortcut.Common.Refresh}
                onAction={() => void revalidate()}
              />
            </ActionPanel>
          }
        />
      ) : (
        <List.EmptyView
          icon={Icon.BarCode}
          title="No dynamic codes yet"
          description="Create one with the “Generate Dynamic QR Code” command."
        />
      )}
      {(codes ?? []).map((code) => (
        <CodeItem
          key={code.id}
          code={code}
          isSelected={selectedId === code.id}
          onChange={revalidate}
        />
      ))}
    </List>
  );
}

function CodeItem({
  code,
  isSelected,
  onChange,
}: {
  code: DynamicCode;
  isSelected: boolean;
  onChange: () => void;
}) {
  const { push } = useNavigation();
  const dashboardUrl = `https://openqr.uk/dashboard/${encodeURIComponent(code.id)}`;
  const keywords = [code.slug, code.destination, code.label ?? ""].filter(
    Boolean,
  ) as string[];

  // Renders only while this row is selected; cached on disk thereafter.
  const { data: qrPath } = usePromise(
    async (active: boolean, url: string, name: string) =>
      active ? renderQrPng(url, { size: 1024, name }) : undefined,
    [isSelected, code.short_url, safeName(code.slug)],
  );

  // 170pt, not more. A List.Item.Detail that also renders metadata gives the markdown
  // roughly 196pt of height, so a larger image is silently cropped at the metadata
  // divider. Measured at 260pt: the bottom 63pt of the code was cut off.
  const detailMarkdown = qrPath
    ? `![QR code](file://${qrPath}?raycast-width=170&raycast-height=170)`
    : "Rendering QR code…";

  return (
    <List.Item
      id={code.id}
      icon={Icon.BarCode}
      title={code.label?.trim() || code.slug}
      keywords={keywords}
      accessories={
        code.status && code.status !== "active"
          ? [{ tag: { value: code.status, color: Color.SecondaryText } }]
          : []
      }
      detail={
        <List.Item.Detail
          markdown={detailMarkdown}
          metadata={
            <List.Item.Detail.Metadata>
              <List.Item.Detail.Metadata.Label
                title="Short URL"
                text={code.short_url}
                icon={Icon.Link}
              />
              <List.Item.Detail.Metadata.Label
                title="Destination"
                text={code.destination}
                icon={Icon.Globe}
              />
              {code.status ? (
                <List.Item.Detail.Metadata.Label
                  title="Status"
                  text={code.status}
                />
              ) : null}
            </List.Item.Detail.Metadata>
          }
        />
      }
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            {qrPath ? (
              <>
                <Action
                  title="Copy QR Code Image"
                  icon={Icon.Clipboard}
                  onAction={async () => {
                    await Clipboard.copy({ file: qrPath });
                    await showToast({
                      style: Toast.Style.Success,
                      title: "QR image copied",
                    });
                  }}
                />
                <Action.ShowInFinder title="Save QR Code Image" path={qrPath} />
              </>
            ) : null}
            <Action
              title="Show QR Code Full Size"
              icon={Icon.BarCode}
              shortcut={{ modifiers: ["cmd", "shift"], key: "k" }}
              onAction={() => push(<QrCodeView code={code} />)}
            />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action.CopyToClipboard
              title="Copy Short URL"
              content={code.short_url}
              icon={Icon.Link}
            />
            <Action.OpenInBrowser title="Open Short URL" url={code.short_url} />
            <Action.OpenInBrowser
              title="Open Destination"
              url={code.destination}
              icon={Icon.Globe}
              shortcut={{ modifiers: ["cmd"], key: "d" }}
            />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action
              title="Edit / Re-Point Code"
              icon={Icon.Pencil}
              shortcut={Keyboard.Shortcut.Common.Edit}
              onAction={() => push(<EditCode code={code} onSaved={onChange} />)}
            />
            <Action
              title="View Scan Analytics"
              icon={Icon.BarChart}
              shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
              onAction={() => push(<ScanAnalytics code={code} />)}
            />
            <ShowScansAction id={code.id} />
            <DeleteCodeAction code={code} onDeleted={onChange} />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action.OpenInBrowser
              title="Open in Dashboard"
              url={dashboardUrl}
              icon={Icon.AppWindowGrid3x3}
              shortcut={Keyboard.Shortcut.Common.Open}
            />
            <Action
              title="Refresh"
              icon={Icon.ArrowClockwise}
              shortcut={Keyboard.Shortcut.Common.Refresh}
              onAction={onChange}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

function EditCode({
  code,
  onSaved,
}: {
  code: DynamicCode;
  onSaved: () => void;
}) {
  const { pop } = useNavigation();
  const [loading, setLoading] = useState(false);

  async function handleSubmit(values: { destination: string; label: string }) {
    const destination = values.destination.trim();
    if (!destination) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Destination URL is required",
      });
      return;
    }
    setLoading(true);
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Saving…",
    });
    try {
      await client().updateDynamicCode(code.id, {
        destination,
        label: values.label.trim() || null,
      });
      toast.style = Toast.Style.Success;
      toast.title = "Saved — code re-pointed";
      toast.message = destination;
      onSaved();
      pop();
    } catch (e) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to save";
      toast.message = errorMessage(e);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Form
      isLoading={loading}
      navigationTitle={`Edit ${code.label?.trim() || code.slug}`}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Save"
            icon={Icon.Check}
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
    >
      <Form.Description
        text={`Re-point ${code.short_url} without reprinting the QR. The printed code keeps working.`}
      />
      <Form.TextField
        id="destination"
        title="Destination URL"
        placeholder="https://example.com/page"
        defaultValue={code.destination}
        autoFocus
      />
      <Form.TextField
        id="label"
        title="Label"
        placeholder="Spring menu (optional)"
        defaultValue={code.label ?? ""}
      />
    </Form>
  );
}

function ScanAnalytics({ code }: { code: DynamicCode }) {
  const { data, isLoading } = useCachedPromise(
    async (id: string) => client().getScans(id, { days: 30 }),
    [code.id],
    {
      onError: (e) => {
        void showToast({
          style: Toast.Style.Failure,
          title: "Failed to load analytics",
          message: errorMessage(e),
        });
      },
    },
  );

  return (
    <Detail
      isLoading={isLoading}
      navigationTitle={`Scans — ${code.label?.trim() || code.slug}`}
      markdown={analyticsMarkdown(code, data)}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser
            title="Open in Dashboard"
            url={`https://openqr.uk/dashboard/${encodeURIComponent(code.id)}`}
            icon={Icon.AppWindowGrid3x3}
          />
          <Action.OpenInBrowser title="Open Short URL" url={code.short_url} />
        </ActionPanel>
      }
    />
  );
}

function analyticsMarkdown(
  code: DynamicCode,
  res: ScansResponse | undefined,
): string {
  if (!res)
    return `# Scan Analytics\n\nLoading scans for \`${code.short_url}\`…`;
  const { scans, analytics } = res;
  const lines = [
    `# ${code.label?.trim() || code.slug}`,
    "",
    `\`${res.short_url}\` → ${res.destination}`,
    "",
    "## Totals",
    "",
    `- **${scans.total}** total scans`,
    `- **${scans.last7}** in the last 7 days`,
    `- **${analytics.window_total}** in the last ${analytics.days_window} days`,
  ];
  const country = breakdown("Top countries", analytics.by_country);
  const device = breakdown("Top devices", analytics.by_device);
  const referrer = breakdown("Top referrers", analytics.by_referrer);
  for (const b of [country, device, referrer]) if (b) lines.push("", b);
  return lines.join("\n");
}

function breakdown(title: string, rows: BreakdownRow[]): string | null {
  if (!rows?.length) return null;
  const body = rows
    .slice(0, 5)
    .map((r) => `- ${r.value || "—"} — **${r.n}**`)
    .join("\n");
  return `## ${title}\n\n${body}`;
}

function DeleteCodeAction({
  code,
  onDeleted,
}: {
  code: DynamicCode;
  onDeleted: () => void;
}) {
  return (
    <Action
      title="Delete Code"
      icon={Icon.Trash}
      style={Action.Style.Destructive}
      shortcut={Keyboard.Shortcut.Common.Remove}
      onAction={async () => {
        const confirmed = await confirmAlert({
          title: `Delete “${code.label?.trim() || code.slug}”?`,
          message: `${code.short_url} will stop working immediately. This cannot be undone.`,
          icon: Icon.Trash,
          primaryAction: {
            title: "Delete",
            style: Alert.ActionStyle.Destructive,
          },
        });
        if (!confirmed) return;
        const toast = await showToast({
          style: Toast.Style.Animated,
          title: "Deleting…",
        });
        try {
          await client().deleteDynamicCode(code.id);
          toast.style = Toast.Style.Success;
          toast.title = "Deleted";
          onDeleted();
        } catch (e) {
          toast.style = Toast.Style.Failure;
          toast.title = "Failed to delete";
          toast.message = errorMessage(e);
        }
      }}
    />
  );
}

function ShowScansAction({ id }: { id: string }) {
  return (
    <Action
      title="Show Scan Counts"
      icon={Icon.Gauge}
      onAction={async () => {
        const toast = await showToast({
          style: Toast.Style.Animated,
          title: "Loading scans…",
        });
        try {
          const res: ScansResponse = await client().getScans(id, { days: 30 });
          const { total, last7, topCountry, topDevice } = res.scans;
          toast.style = Toast.Style.Success;
          toast.title = `${total} scans (${last7} in last 7 days)`;
          toast.message =
            [topCountry && `Top: ${topCountry}`, topDevice]
              .filter(Boolean)
              .join(" · ") || undefined;
        } catch (e) {
          toast.style = Toast.Style.Failure;
          toast.title = "Failed to load scans";
          toast.message = errorMessage(e);
        }
      }}
    />
  );
}

/**
 * The scannable artefact for an existing code. Renders the short URL — never the destination —
 * because the whole point of a dynamic code is that the printed image survives a re-point.
 */
function QrCodeView({ code }: { code: DynamicCode }) {
  const { data: path, isLoading } = usePromise(
    (url: string, name: string) => renderQrPng(url, { size: 1024, name }),
    [code.short_url, safeName(code.slug)],
    {
      onError: (e) => {
        void showToast({
          style: Toast.Style.Failure,
          title: "Could not render QR code",
          message: errorMessage(e),
        });
      },
    },
  );

  const title = code.label?.trim() || code.slug;
  const markdown = path
    ? `# ${title}\n\n![QR code](file://${path}?raycast-width=340&raycast-height=340)\n\n\`${code.short_url}\``
    : `# ${title}\n\nRendering QR code…`;

  return (
    <Detail
      isLoading={isLoading}
      markdown={markdown}
      actions={
        path ? (
          <ActionPanel>
            <Action
              title="Copy QR Code Image"
              icon={Icon.Clipboard}
              onAction={async () => {
                await Clipboard.copy({ file: path });
                await showToast({
                  style: Toast.Style.Success,
                  title: "QR image copied",
                });
              }}
            />
            <Action.ShowInFinder title="Save QR Code Image" path={path} />
            <Action.Open title="Open QR Code Image" target={path} />
            <Action.CopyToClipboard
              title="Copy Short URL"
              content={code.short_url}
              icon={Icon.Link}
            />
          </ActionPanel>
        ) : undefined
      }
    />
  );
}
