import {
  Action,
  ActionPanel,
  Clipboard,
  Icon,
  List,
  Form,
  showHUD,
  showToast,
  Toast,
  Keyboard,
} from "@raycast/api";
import { useState, useCallback } from "react";
import { decodeQrsFromPng } from "./decode";
import { ContentInfo, detectContentType } from "./content-type";

interface DecodedQr {
  raw: string;
  info: ContentInfo;
}

type ScanState =
  | { status: "idle" }
  | { status: "scanning" }
  | { status: "success"; results: DecodedQr[]; filePath: string }
  | { status: "failure"; message: string; filePath: string };

export default function Command() {
  const [state, setState] = useState<ScanState>({ status: "idle" });

  const handleScanFile = useCallback(async (filePath: string) => {
    setState({ status: "scanning" });
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Scanning image file...",
    });

    try {
      const contents = await decodeQrsFromPng(filePath);
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
          : "Make sure the selected file contains a clear QR code.";

      setState({ status: "success", results, filePath });
    } catch {
      toast.style = Toast.Style.Failure;
      toast.title = "Could not parse image";
      toast.message = "Please make sure it is a valid PNG image.";

      setState({
        status: "failure",
        message:
          "Could not read image file. Please make sure it is a valid PNG image.",
        filePath,
      });
    }
  }, []);

  const handleFormSubmit = useCallback(
    (values: { files: string[] }) => {
      if (values.files.length === 0) {
        showToast({
          style: Toast.Style.Failure,
          title: "No file selected",
          message: "Please choose an image file to scan.",
        });
        return;
      }
      handleScanFile(values.files[0]);
    },
    [handleScanFile],
  );

  if (state.status === "idle") {
    return (
      <Form
        actions={
          <ActionPanel>
            <Action.SubmitForm
              title="Scan File for QR Codes"
              onSubmit={handleFormSubmit}
            />
          </ActionPanel>
        }
      >
        <Form.Description text="Select or drag-and-drop a PNG screenshot containing a QR code." />
        <Form.FilePicker
          id="files"
          title="Image File"
          allowMultipleSelection={false}
          canChooseDirectories={false}
        />
      </Form>
    );
  }

  if (state.status === "scanning") {
    return (
      <List isLoading={true}>
        <List.EmptyView
          title="Scanning image file..."
          icon={Icon.MagnifyingGlass}
        />
      </List>
    );
  }

  if (state.status === "failure") {
    return (
      <List
        actions={
          <ActionPanel>
            <Action
              icon={Icon.Undo}
              title="Choose Another File"
              onAction={() => setState({ status: "idle" })}
            />
          </ActionPanel>
        }
      >
        <List.EmptyView
          icon={Icon.XMarkCircle}
          title="Could not read image"
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
              icon={Icon.Undo}
              title="Choose Another File"
              onAction={() => setState({ status: "idle" })}
            />
          </ActionPanel>
        }
      >
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title="No QR code found"
          description="Make sure the QR code in the image is clear and unobstructed."
        />
      </List>
    );
  }

  return (
    <List searchBarPlaceholder="Search decoded QR contents">
      {state.results.length > 1 ? (
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
                  icon={Icon.Undo}
                  title="Choose Another File"
                  onAction={() => setState({ status: "idle" })}
                />
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      ) : null}

      {state.results.map((result, index) => (
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
                    shortcut={Keyboard.Shortcut.Common.Copy}
                    onAction={() =>
                      copyAllQrContents(state.results.map((r) => r.raw))
                    }
                  />
                </ActionPanel.Section>
              ) : null}
              <ActionPanel.Section>
                <Action
                  icon={Icon.Undo}
                  title="Choose Another File"
                  shortcut={Keyboard.Shortcut.Common.Refresh}
                  onAction={() => setState({ status: "idle" })}
                />
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      ))}
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

async function copyAllQrContents(contents: string[]) {
  await Clipboard.copy(contents.join("\n"));
  await showHUD(`Copied ${contents.length} QR code contents to clipboard`);
}
