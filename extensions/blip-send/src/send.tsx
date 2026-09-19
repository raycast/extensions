import { List } from "@raycast/api";
import { useEffect, useState } from "react";
import { FilesForm } from "./components/FilesForm";
import { RecipientList } from "./components/RecipientList";
import { fileManager, isWindows } from "./platform";
import { selectedFiles } from "./selection";

type Stage =
  { kind: "loading" } | { kind: "files"; files: string[] } | { kind: "pick"; reason?: string; initialFiles?: string[] };

/**
 * Send Files with Blip.
 * Uses the file manager selection when there is one; otherwise shows a file picker.
 */
export default function Command() {
  const [stage, setStage] = useState<Stage>({ kind: "loading" });

  useEffect(() => {
    selectedFiles()
      .then((files) => {
        setStage(
          files.length > 0
            ? { kind: "files", files }
            : { kind: "pick", reason: `Nothing is selected in ${fileManager}. Choose what to send.` },
        );
      })
      .catch(() =>
        setStage({
          kind: "pick",
          reason: isWindows
            ? `Could not read the ${fileManager} selection. Choose what to send.`
            : `${fileManager} is not the active app. Choose what to send.`,
        }),
      );
  }, []);

  if (stage.kind === "loading") return <List isLoading searchBarPlaceholder={`Reading ${fileManager} selection…`} />;
  if (stage.kind === "pick") return <FilesForm reason={stage.reason} initialFiles={stage.initialFiles} />;
  return (
    <RecipientList files={stage.files} onChangeFiles={() => setStage({ kind: "pick", initialFiles: stage.files })} />
  );
}
