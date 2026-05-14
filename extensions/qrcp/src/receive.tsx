import { Detail, showToast, Toast, open, getPreferenceValues } from "@raycast/api";
import React, { useEffect, useState } from "react";
import path from "path";
import { homedir } from "os";
import { generateQRCode, startReceiveServer } from "./utils/qrcp";

export default function Receive() {
  const [qrCode, setQrCode] = useState<string>("");
  const [serverUrl, setServerUrl] = useState<string>("");
  const [status, setStatus] = useState<string>("Waiting for connection...");
  const [connectedDevices, setConnectedDevices] = useState<string[]>([]);
  const preferences = getPreferenceValues<{ downloadDirectory?: string; openFinderOnReceive?: boolean }>();

  const preferredDownloadDir = resolveDownloadDirectory(preferences.downloadDirectory);

  const fallbackDownloadDir = path.join(homedir(), "Downloads");
  const resolvedDownloadDir = preferredDownloadDir ?? fallbackDownloadDir;

  useEffect(() => {
    let isMounted = true;
    let cleanup: (() => Promise<void>) | undefined;

    async function setup() {
      try {
        const server = await startReceiveServer({ downloadDir: resolvedDownloadDir });
        cleanup = server.close;
        if (!isMounted) {
          await server.close();
          return;
        }
        setServerUrl(server.url);
        setQrCode(await generateQRCode(server.url));
        setStatus("Ready to receive files");
        server.onFileReceived?.((fileName: string) => {
          if (!isMounted) {
            return;
          }
          setStatus(`Received: ${fileName}`);
          showToast({ style: Toast.Style.Success, title: "File received", message: fileName });
          if (preferences.openFinderOnReceive ?? true) {
            void open(resolvedDownloadDir);
          }
        });
        server.onDeviceConnected?.((ip: string) => {
          if (!isMounted) {
            return;
          }
          setConnectedDevices((prev) => (prev.includes(ip) ? prev : [...prev, ip]));
          showToast({ style: Toast.Style.Success, title: "Device connected", message: `Device ${ip} connected` });
        });
      } catch (e: unknown) {
        if (isMounted) {
          setStatus("Error starting server");
          const message =
            typeof e === "object" && e && "message" in e ? String((e as { message?: unknown }).message) : String(e);
          showToast({ style: Toast.Style.Failure, title: "Error", message });
        }
      }
    }

    void setup();

    return () => {
      isMounted = false;
      if (cleanup) {
        void cleanup();
      }
    };
  }, [preferredDownloadDir]);

  return (
    <Detail
      navigationTitle="Receive Files"
      markdown={`# Receive Files\n\nScan this QR code to send files to your computer.\n\n${qrCode ? `![QR Code](${qrCode})` : ""}`}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Status" text={status} />
          {serverUrl && <Detail.Metadata.Link title="Server URL" text={serverUrl} target={serverUrl} />}
          <Detail.Metadata.Label title="Download Folder" text={resolvedDownloadDir} />
          {connectedDevices.length > 0 && (
            <Detail.Metadata.TagList title="Connected Devices">
              {connectedDevices.map((ip) => (
                <Detail.Metadata.TagList.Item key={ip} text={ip} />
              ))}
            </Detail.Metadata.TagList>
          )}
        </Detail.Metadata>
      }
    />
  );
}

function resolveDownloadDirectory(input?: string): string | undefined {
  if (!input) {
    return undefined;
  }
  const trimmed = input.trim();
  if (!trimmed) {
    return undefined;
  }
  if (trimmed === "~") {
    return homedir();
  }
  if (trimmed.startsWith("~/")) {
    return path.join(homedir(), trimmed.slice(2));
  }
  return trimmed;
}
