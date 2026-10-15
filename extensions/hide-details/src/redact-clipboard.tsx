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
import { useCallback, useEffect, useRef, useState } from "react";
import { CategorySettings } from "./category-settings";
import {
  copyRedacted,
  disposeScan,
  redactClipboard,
  updateRedactions,
  type Detection,
  type Hit,
  type Scan,
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

export default function Command() {
  const { showOCRConfidence = true } = getPreferenceValues<Preferences>();
  const [scan, setScan] = useState<Scan | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);
  const editing = useRef(false);
  const generation = useRef(0);
  const current = useRef<Scan | null>(null);

  const rescan = useCallback(async (recognition?: "accurate") => {
    const request = ++generation.current;
    editing.current = false;
    setUpdating(false);
    release(current.current);
    current.current = null;
    setScan(null);
    setError(null);
    try {
      const result = await redactClipboard({ recognition, forReview: true });
      if (generation.current !== request) {
        release(result);
        return;
      }
      current.current = result;
      setScan(result);
    } catch (failure) {
      if (generation.current === request) setError(failure instanceof Error ? failure.message : String(failure));
    }
  }, []);

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
                  message: `${scan.regionCount} region${scan.regionCount === 1 ? "" : "s"} masked. Review before sharing.`,
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
        {scan && hit && !updating && (
          <Action
            title={scan.excludedIds.includes(hit.id) ? "Redact" : "Don't Redact"}
            icon={scan.excludedIds.includes(hit.id) ? Icon.EyeDisabled : Icon.Eye}
            shortcut={{ modifiers: ["cmd"], key: "d" }}
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
          title="Scan Current Clipboard Again"
          icon={Icon.ArrowClockwise}
          shortcut={Keyboard.Shortcut.Common.Refresh}
          onAction={() => rescan()}
        />
        <Action
          title="Scan Current Clipboard with Accurate OCR"
          icon={Icon.MagnifyingGlass}
          shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
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
  const preview = (hit?: Detection) =>
    scan ? (
      <List.Item.Detail
        markdown={`![Redacted clipboard image](<${scan.output}>)\n\n${updating ? "Updating preview… Copy is unavailable until it finishes.\n\n" : ""}Review this image before sharing. Automatic detection can miss details.${scan.excludedIds.length ? ` ${scan.excludedIds.length} detection(s) excluded. Other detections may still mask overlapping regions.` : ""}${hit ? `\n\nSelected detection: ${hit.kind}. Region from top left: x ${hit.box.x}, y ${hit.box.y}, width ${hit.box.width}, height ${hit.box.height} pixels. Status: ${scan.excludedIds.includes(hit.id) ? "Don’t redact" : "Redact"}.` : ""} Copy replaces the current clipboard with this preview.`}
      />
    ) : undefined;
  return (
    <List isLoading={!scan || updating} isShowingDetail={!!scan} searchBarPlaceholder="Review detections">
      {scan && (
        <List.Item
          key="preview"
          icon={Icon.Image}
          title="Redacted Image"
          subtitle={`${scan.regionCount} masked region${scan.regionCount === 1 ? "" : "s"}`}
          detail={preview()}
          actions={actions()}
        />
      )}
      <List.Section title={scan ? `${hits.length} detections` : "Scanning on device"}>
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
              ...(hit.confidenceSource === "ocr" && !showOCRConfidence
                ? []
                : [
                    {
                      text:
                        hit.confidenceSource === "rule"
                          ? "Custom word match"
                          : `${hit.confidenceSource === "face" ? "Face" : "OCR"} ${Math.round(hit.confidence * 100)}%`,
                      tooltip:
                        hit.confidenceSource === "rule"
                          ? "Matched an Always Hide These Words rule."
                          : "Recognition confidence does not measure redaction completeness.",
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
