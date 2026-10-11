import {
  Action,
  ActionPanel,
  Icon,
  Keyboard,
  List,
  Toast,
  getPreferenceValues,
  openExtensionPreferences,
  showToast,
} from "@raycast/api";
import { useCallback, useEffect, useRef, useState } from "react";
import { copyRedacted, disposeScan, redactClipboard, type Hit, type Scan } from "./redaction";

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
  const generation = useRef(0);
  const current = useRef<Scan | null>(null);

  const rescan = useCallback(async (recognition?: "accurate") => {
    const request = ++generation.current;
    release(current.current);
    current.current = null;
    setScan(null);
    setError(null);
    try {
      const result = await redactClipboard({ recognition });
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

  function actions() {
    return (
      <ActionPanel>
        {scan && (
          <Action
            title="Copy Redacted Image"
            icon={Icon.Clipboard}
            onAction={async () => {
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
  const preview = scan ? (
    <List.Item.Detail
      markdown={`![Redacted clipboard image](<${scan.output}>)\n\nReview this image before sharing. Automatic detection can miss details. Copy replaces the current clipboard with this preview.`}
    />
  ) : undefined;
  return (
    <List isLoading={!scan} isShowingDetail={!!scan} searchBarPlaceholder="Review detections">
      {scan && (
        <List.Item
          key="preview"
          icon={Icon.Image}
          title="Redacted Image"
          subtitle={`${scan.regionCount} masked region${scan.regionCount === 1 ? "" : "s"}`}
          detail={preview}
          actions={actions()}
        />
      )}
      <List.Section title={scan ? `${hits.length} detections` : "Scanning on device"}>
        {hits.map((hit, i) => (
          <List.Item
            key={`${hit.kind}-${i}`}
            icon={kindIcon[hit.kind]}
            title={hit.kind === "custom" ? "Custom Regex" : hit.kind}
            subtitle={hit.kind === "face" ? "Face masked" : "••••••••"}
            accessories={
              hit.confidenceSource === "ocr" && !showOCRConfidence
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
                  ]
            }
            detail={preview}
            actions={actions()}
          />
        ))}
      </List.Section>
    </List>
  );
}
