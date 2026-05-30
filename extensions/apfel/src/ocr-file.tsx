import { Action, ActionPanel, Clipboard, Detail, popToRoot, showHUD, showToast, Toast } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { basename, extname } from "path";
import { runAugeOcr } from "./api/auge";
import { AugeGuard } from "./components/AugeGuard";
import { getFinderSelection, isDirectory } from "./utils/finder";

const SUPPORTED_EXTENSIONS = new Set(["png", "jpg", "jpeg", "tiff", "tif", "bmp", "gif", "heic", "pdf"]);

export default function Command() {
  return (
    <AugeGuard checkForFileSystemPermission>
      <OcrFile />
    </AugeGuard>
  );
}

function OcrFile() {
  const { isLoading, data, error } = usePromise(async () => {
    const selection = await getFinderSelection();

    if (!selection) {
      await showHUD("No file selected in Finder");
      await popToRoot();
      return;
    }

    const filePath = selection as string;

    if (isDirectory(filePath)) {
      await showHUD("Selected item is a directory, not a file");
      await popToRoot();
      return;
    }

    const ext = extname(filePath).slice(1).toLowerCase();
    if (!SUPPORTED_EXTENSIONS.has(ext)) {
      await showHUD(`Unsupported file type: .${ext || "unknown"}. Use PNG, JPEG, TIFF, BMP, GIF, HEIC, or PDF.`);
      await popToRoot();
      return;
    }

    await showToast({ style: Toast.Style.Animated, title: "Extracting text…" });

    const text = await runAugeOcr({ type: "file", path: filePath });

    if (!text) {
      await showToast({ style: Toast.Style.Failure, title: "No text found in file" });
      return;
    }

    await Clipboard.copy(text);
    await showToast({ style: Toast.Style.Success, title: "Text copied to clipboard!" });

    return { text, name: basename(filePath), path: filePath };
  });

  if (error) {
    return <Detail markdown={`# Error\n\n${error.message}`} />;
  }

  return (
    <Detail
      isLoading={isLoading}
      markdown={data?.text ?? ""}
      metadata={
        data && (
          <Detail.Metadata>
            <Detail.Metadata.Label title="File" text={data.name} />
            <Detail.Metadata.Label title="Path" text={data.path} />
          </Detail.Metadata>
        )
      }
      actions={
        data ? (
          <ActionPanel>
            <Action.CopyToClipboard title="Copy Text" content={data.text} />
          </ActionPanel>
        ) : null
      }
    />
  );
}
