import { useEffect, useState } from "react";
import { basename } from "path";
import {
  Action,
  ActionPanel,
  Alert,
  Clipboard,
  closeMainWindow,
  confirmAlert,
  Detail,
  PopToRootType,
  showHUD,
} from "@raycast/api";
import { uploadFile, uploadFromUrl } from "./lib/cdnClient";
import { resolveClipboardInput } from "./lib/clipboardResolver";
import { addUpload } from "./lib/uploadHistory";
import { useApiToken } from "./hooks/useApiToken";
import { CdnApiError } from "./lib/types";
import SetupRequired from "./components/SetupRequired";

export default function Command() {
  const token = useApiToken();
  const [isWorking, setIsWorking] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      return;
    }

    (async () => {
      try {
        const resolution = await resolveClipboardInput();

        if (resolution.type === "none") {
          await closeMainWindow({ popToRootType: PopToRootType.Immediate });
          await showHUD("Clipboard doesn't contain a file, path, or link");
          return;
        }

        if (resolution.type === "already-cdn-link") {
          await closeMainWindow({ popToRootType: PopToRootType.Immediate });
          await showHUD("This is already a Hack Club CDN link. No need to upload it again.");
          return;
        }

        if (resolution.needsConfirm) {
          const confirmTitle =
            resolution.type === "path-text" ? `Upload "${basename(resolution.path)}"?` : "Upload this link?";
          const confirmMessage = resolution.type === "path-text" ? resolution.path : resolution.url;
          const confirmed = await confirmAlert({
            title: confirmTitle,
            message: confirmMessage,
            primaryAction: { title: "Upload", style: Alert.ActionStyle.Default },
          });
          if (!confirmed) {
            await closeMainWindow({ popToRootType: PopToRootType.Immediate });
            return;
          }
        }

        const record =
          resolution.type === "url"
            ? await uploadFromUrl(resolution.url, token)
            : await uploadFile(resolution.path, token);

        await addUpload(record);
        await Clipboard.copy(record.url);
        await closeMainWindow({ popToRootType: PopToRootType.Immediate });
        await showHUD("Copied CDN link! Undo anytime in Recent Uploads");
      } catch (error) {
        const message =
          error instanceof CdnApiError ? error.message : error instanceof Error ? error.message : "Upload failed";
        setError(message);
      } finally {
        setIsWorking(false);
      }
    })();
  }, [token]);

  if (!token) {
    return <SetupRequired />;
  }

  if (error) {
    return (
      <Detail
        markdown={`# Upload Failed\n\n${error}`}
        actions={
          <ActionPanel>
            <Action.CopyToClipboard title="Copy Error Message" content={error} />
          </ActionPanel>
        }
      />
    );
  }

  return <Detail isLoading={isWorking} />;
}
