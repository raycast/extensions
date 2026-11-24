import {
  Action,
  ActionPanel,
  Color,
  Icon,
  Keyboard,
  List,
  Toast,
  getPreferenceValues,
  openExtensionPreferences,
  showToast,
} from "@raycast/api";
import { CategorySettings } from "./category-settings";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  canReview,
  copyRedacted,
  disposeScan,
  historyLabel,
  plural,
  reportsConfidence,
  updateRedactions,
  type Detection,
  type Hit,
  type Scan,
  type ScanSource,
} from "./redaction";

const kindIcon: Record<Hit["kind"], Icon> = {
  email: Icon.Envelope,
  phone: Icon.Phone,
  card: Icon.CreditCard,
  secret: Icon.Key,
  ip: Icon.Globe,
  name: Icon.Person,
  face: Icon.PersonCircle,
  custom: Icon.Code,
};

function release(scan: Scan | null) {
  if (scan) void disposeScan(scan).catch(() => undefined);
}

function sourceNote(source: ScanSource, fallback: boolean) {
  if (source.kind === "clipboard") return "";
  const where = `the image file in clipboard history (${historyLabel(source.offset).toLowerCase()})`;
  return fallback
    ? `The current clipboard has no image, so this preview uses ${where}.\n\n`
    : `This preview uses ${where}.\n\n`;
}

export function Review(props: {
  load: (recognition?: "accurate") => Promise<Scan>;
  // Clipboard scans can fall back to history; history scans always target one entry.
  target: "clipboard" | "history";
}) {
  const { load, target } = props;
  const { showOCRConfidence = true } = getPreferenceValues<Preferences>();
  const [scan, setScan] = useState<Scan | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);
  const editing = useRef(false);
  const generation = useRef(0);
  const current = useRef<Scan | null>(null);

  const rescan = useCallback(
    async (recognition?: "accurate") => {
      const request = ++generation.current;
      editing.current = false;
      setUpdating(false);
      release(current.current);
      current.current = null;
      setScan(null);
      setError(null);
      try {
        const result = await load(recognition);
        if (generation.current !== request) {
          release(result);
          return;
        }
        current.current = result;
        setScan(result);
      } catch (failure) {
        if (generation.current === request) setError(failure instanceof Error ? failure.message : String(failure));
      }
    },
    [load],
  );

  useEffect(() => {
    void rescan();
    return () => {
      generation.current++;
      release(current.current);
      current.current = null;
    };
  }, [rescan]);

  async function changeExclusions(excludedIds: readonly string[]) {
    if (!scan || editing.current) return;
    const request = generation.current;
    editing.current = true;
    setUpdating(true);
    try {
      const next = await updateRedactions(scan, excludedIds);
      if (generation.current !== request) return;
      current.current = next;
      setScan(next);
    } catch (failure) {
      if (generation.current === request) {
        await showToast({ style: Toast.Style.Failure, title: "Could Not Update Preview", message: String(failure) });
      }
    } finally {
      if (generation.current === request) {
        editing.current = false;
        setUpdating(false);
      }
    }
  }

  const subject = target === "clipboard" ? "Current Clipboard" : "Image";

  function actions(hit?: Detection) {
    return (
      <ActionPanel>
        {scan && !updating && (
          <Action
            title="Copy Redacted Image"
            icon={Icon.Clipboard}
            onAction={async () => {
              if (editing.current || current.current !== scan) return;
              try {
                await copyRedacted(scan);
                await showToast({
                  style: Toast.Style.Success,
                  title: "Redacted Image Copied",
                  message: `${plural(scan.regionCount, "region")} masked. Review before sharing.`,
                });
              } catch (failure) {
                await showToast({
                  style: Toast.Style.Failure,
                  title: "Could Not Copy Image",
                  message: failure instanceof Error ? failure.message : String(failure),
                });
              }
            }}
          />
        )}
        {scan && hit && !updating && canReview(scan) && (
          <Action
            title={scan.excludedIds.includes(hit.id) ? "Redact" : "Don't Redact"}
            icon={scan.excludedIds.includes(hit.id) ? Icon.EyeDisabled : Icon.Eye}
            shortcut={{
              macOS: { modifiers: ["cmd"], key: "d" },
              Windows: { modifiers: ["ctrl"], key: "d" },
            }}
            onAction={() =>
              changeExclusions(
                scan.excludedIds.includes(hit.id)
                  ? scan.excludedIds.filter((id) => id !== hit.id)
                  : [...scan.excludedIds, hit.id],
              )
            }
          />
        )}
        {scan && scan.excludedIds.length > 0 && !updating && (
          <Action title="Redact All Detections" icon={Icon.Undo} onAction={() => changeExclusions([])} />
        )}
        <Action.Push
          title="Configure What to Hide"
          icon={Icon.CheckList}
          target={<CategorySettings onSave={() => void rescan()} />}
        />
        <Action
          title={`Scan ${subject} Again`}
          icon={Icon.ArrowClockwise}
          shortcut={Keyboard.Shortcut.Common.Refresh}
          onAction={() => rescan()}
        />
        <Action
          title={`Scan ${subject} with Accurate OCR`}
          icon={Icon.MagnifyingGlass}
          shortcut={{
            macOS: { modifiers: ["cmd", "shift"], key: "r" },
            Windows: { modifiers: ["ctrl", "shift"], key: "r" },
          }}
          onAction={() => rescan("accurate")}
        />
        <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
      </ActionPanel>
    );
  }

  if (error) {
    return (
      <List>
        <List.EmptyView icon={Icon.Image} title="Could Not Redact" description={error} actions={actions()} />
      </List>
    );
  }

  const hits = scan?.hits ?? [];
  const fromHistory = scan?.source.kind === "history" ? scan.source : null;
  const preview = (hit?: Detection) =>
    scan ? (
      <List.Item.Detail
        markdown={`![Redacted image](<${scan.output}>)\n\n${updating ? "Updating preview… Copy is unavailable until it finishes.\n\n" : ""}${sourceNote(scan.source, target === "clipboard")}Review this image before sharing. Automatic detection can miss details.${scan.excludedIds.length ? ` ${scan.excludedIds.length} detection(s) excluded. Other detections may still mask overlapping regions.` : ""}${hit ? `\n\nSelected detection: ${hit.kind}. Region from top left: x ${hit.box.x}, y ${hit.box.y}, width ${hit.box.width}, height ${hit.box.height} pixels. Status: ${scan.excludedIds.includes(hit.id) ? "Don’t redact" : "Redact"}.` : ""} Copy replaces the current clipboard with this preview.`}
      />
    ) : undefined;
  return (
    <List isLoading={!scan || updating} isShowingDetail={!!scan} searchBarPlaceholder="Review detections">
      {scan && (
        <List.Item
          key="preview"
          icon={Icon.Image}
          title="Redacted Image"
          subtitle={plural(scan.regionCount, "masked region")}
          accessories={
            fromHistory
              ? [{ tag: { value: "History", color: Color.Blue }, tooltip: historyLabel(fromHistory.offset) }]
              : []
          }
          detail={preview()}
          actions={actions()}
        />
      )}
      <List.Section title={scan ? plural(hits.length, "detection") : "Scanning on device"}>
        {hits.map((hit, i) => (
          <List.Item
            key={hit.id}
            id={hit.id}
            icon={kindIcon[hit.kind]}
            title={`${hit.kind === "custom" ? "Custom Regex" : hit.kind} ${i + 1}`}
            subtitle={
              hit.kind === "face" ? (scan?.excludedIds.includes(hit.id) ? "Face excluded" : "Face masked") : "••••••••"
            }
            accessories={[
              ...(scan?.excludedIds.includes(hit.id) ? [{ tag: { value: "Don't Redact", color: Color.Orange } }] : []),
              ...(hit.confidenceSource === "rule"
                ? [{ text: "Custom word match", tooltip: "Matched an Always Hide These Words rule." }]
                : !reportsConfidence || (hit.confidenceSource === "ocr" && !showOCRConfidence)
                  ? []
                  : [
                      {
                        text: `${hit.confidenceSource === "face" ? "Face" : "OCR"} ${Math.round(hit.confidence * 100)}%`,
                        tooltip: "Recognition confidence does not measure redaction completeness.",
                      },
                    ]),
            ]}
            detail={preview(hit)}
            actions={actions(hit)}
          />
        ))}
      </List.Section>
    </List>
  );
}
