import { getSelectedFinderItems, showToast, Toast, Detail } from "@raycast/api";
import React, { useEffect, useState } from "react";
import { generateQRCode, startSendServer } from "./utils/qrcp";

export default function Send() {
  const [qrCode, setQrCode] = useState<string>("");
  const [serverUrl, setServerUrl] = useState<string>("");
  const [status, setStatus] = useState<string>("Preparing files...");

  useEffect(() => {
    let isMounted = true;
    let cleanup: (() => Promise<void>) | undefined;

    async function setup() {
      try {
        const items = await getSelectedFinderItems();
        if (!items.length) {
          if (isMounted) {
            setStatus("No files selected in Finder.");
          }
          return;
        }
        // getSelectedFinderItems returns objects, map to file paths
        const filePaths = items.map((item: { path: string }) => item.path);
        const server = await startSendServer(filePaths);
        cleanup = server.close;
        if (!isMounted) {
          await server.close();
          return;
        }
        setServerUrl(server.url);
        setQrCode(await generateQRCode(server.url));
        setStatus("Ready to send files");
        server.onDownload(() => {
          if (!isMounted) {
            return;
          }
          setStatus("Files downloaded!");
          showToast({ style: Toast.Style.Success, title: "Files sent" });
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
  }, []);

  return (
    <Detail
      navigationTitle="Send Files"
      markdown={`# Send Files\n\nScan this QR code to download files from your computer.\n\n${qrCode ? `![QR Code](${qrCode})` : ""}`}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Status" text={status} />
          {serverUrl && <Detail.Metadata.Link title="Server URL" text={serverUrl} target={serverUrl} />}
        </Detail.Metadata>
      }
    />
  );
}
