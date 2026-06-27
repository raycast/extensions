import {
  Action,
  ActionPanel,
  Clipboard,
  closeMainWindow,
  Icon,
  List,
  showHUD,
  showToast,
  Toast,
  Keyboard,
} from "@raycast/api";
import { useCallback, useEffect, useState } from "react";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { captureDisplay, wait } from "./capture";
import { decodeQrsFromPng } from "./decode";
import { ContentInfo, detectContentType } from "./content-type";

const SCREENSHOT_DELAY_MS = 250;

interface DecodedQr {
  raw: string;
  info: ContentInfo;
}

type ScanState =
  | { status: "scanning" }
  | { status: "success"; results: DecodedQr[] }
  | { status: "failure"; message: string };

export default function Command() {
  const [state, setState] = useState<ScanState>({ status: "scanning" });

  const scan = useCallback(() => {
    setState({ status: "scanning" });

    scanDisplay()
      .then((results) => {
        setState({ status: "success", results });
      })
      .catch((error: unknown) => {
        setState({
          status: "failure",
          message: error instanceof Error ? error.message : String(error),
        });
      });
  }, []);

  useEffect(() => {
    scan();
  }, [scan]);

  if (state.status === "failure") {
    return (
      <List
        actions={
          <ActionPanel>
            <Action
              icon={Icon.RotateClockwise}
              title="Rescan Display"
              shortcut={Keyboard.Shortcut.Common.Refresh}
              onAction={scan}
            />
          </ActionPanel>
        }
      >
        <List.EmptyView
          icon={Icon.XMarkCircle}
          title="Could not scan display"
          description={state.message}
        />
      </List>
    );
  }

  if (state.status === "success" && state.results.length === 0) {
    return (
      <List
        actions={
          <ActionPanel>
            <Action
              icon={Icon.RotateClockwise}
              title="Rescan Display"
              shortcut={Keyboard.Shortcut.Common.Refresh}
              onAction={scan}
            />
          </ActionPanel>
        }
      >
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title="No QR code found"
          description="Make sure QR codes are visible and unobstructed."
        />
      </List>
    );
  }

  return (
    <List
      isLoading={state.status === "scanning"}
      searchBarPlaceholder="Search decoded QR contents"
    >
      {state.status === "success" && state.results.length > 1 ? (
        <List.Item
          icon={Icon.Clipboard}
          title="Copy All QR Contents"
          subtitle={`${state.results.length} QR codes found`}
          actions={
            <ActionPanel>
              <ActionPanel.Section title="Clipboard">
                <Action
                  icon={Icon.Clipboard}
                  title="Copy All"
                  onAction={() =>
                    copyAllQrContents(state.results.map((r) => r.raw))
                  }
                />
              </ActionPanel.Section>
              <ActionPanel.Section>
                <Action
                  icon={Icon.RotateClockwise}
                  title="Rescan Display"
                  shortcut={Keyboard.Shortcut.Common.Refresh}
                  onAction={scan}
                />
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      ) : null}

      {state.status === "success"
        ? state.results.map((result, index) => (
            <List.Item
              key={`${result.raw}-${index}`}
              icon={result.info.icon}
              title={result.raw}
              subtitle={result.info.label}
              accessories={[{ text: `${result.raw.length} chars` }]}
              actions={
                <ActionPanel>
                  <ActionPanel.Section title={result.info.label}>
                    {renderPrimaryAction(result)}
                    <Action.CopyToClipboard
                      title="Copy to Clipboard"
                      content={result.raw}
                      shortcut={Keyboard.Shortcut.Common.Copy}
                    />
                    <Action.Paste
                      title="Paste to Active App"
                      content={result.raw}
                    />
                  </ActionPanel.Section>
                  {state.results.length > 1 ? (
                    <ActionPanel.Section title="All Results">
                      <Action
                        icon={Icon.Clipboard}
                        title="Copy All QR Contents"
                        onAction={() =>
                          copyAllQrContents(state.results.map((r) => r.raw))
                        }
                      />
                    </ActionPanel.Section>
                  ) : null}
                  <ActionPanel.Section>
                    <Action
                      icon={Icon.RotateClockwise}
                      title="Rescan Display"
                      shortcut={Keyboard.Shortcut.Common.Refresh}
                      onAction={scan}
                    />
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
          ))
        : null}
    </List>
  );
}

function renderPrimaryAction(result: DecodedQr) {
  const { info, raw } = result;

  switch (info.type) {
    case "url":
      return <Action.OpenInBrowser title="Open in Browser" url={info.url!} />;
    case "email":
      return (
        <Action.OpenInBrowser
          title="Compose Email"
          icon={Icon.Envelope}
          url={info.url!}
        />
      );
    case "phone":
      return (
        <Action.OpenInBrowser
          title="Call Number"
          icon={Icon.Phone}
          url={info.url!}
        />
      );
    case "sms":
      return (
        <Action.OpenInBrowser
          title="Send SMS"
          icon={Icon.Message}
          url={info.url!}
        />
      );
    case "wifi":
      if (info.wifiPassword) {
        return (
          <Action.Paste
            title="Paste WiFi Password"
            icon={Icon.Wifi}
            content={info.wifiPassword}
          />
        );
      }
      return (
        <Action.CopyToClipboard
          title="Copy WiFi Details"
          icon={Icon.Wifi}
          content={raw}
        />
      );
    case "geo":
      return (
        <Action.OpenInBrowser
          title="Open in Maps"
          icon={Icon.Map}
          url={`https://maps.google.com/?q=${encodeURIComponent(raw.replace(/^geo:/i, ""))}`}
        />
      );
    default:
      return null;
  }
}

async function scanDisplay(): Promise<DecodedQr[]> {
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Scanning display deeply...",
  });

  const tempDirectory = await mkdtemp(join(tmpdir(), "raycast-qr-"));
  const screenshotPath = join(tempDirectory, "display.png");

  try {
    await closeMainWindow({ clearRootSearch: true });
    await wait(SCREENSHOT_DELAY_MS);
    await captureDisplay(screenshotPath);

    const contents = await decodeQrsFromPng(screenshotPath);
    const results = contents.map((raw) => ({
      raw,
      info: detectContentType(raw),
    }));

    toast.style =
      results.length > 0 ? Toast.Style.Success : Toast.Style.Failure;
    toast.title =
      results.length > 0
        ? `Found ${results.length} QR code${results.length === 1 ? "" : "s"}`
        : "No QR code found";
    toast.message =
      results.length > 0
        ? "Choose a result or copy all contents."
        : "Make sure QR codes are visible and unobstructed.";

    return results;
  } finally {
    await rm(tempDirectory, { force: true, recursive: true });
  }
}

async function copyAllQrContents(contents: string[]) {
  await Clipboard.copy(contents.join("\n"));
  await showHUD(`Copied ${contents.length} QR code contents to clipboard`);
}
