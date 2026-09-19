import { getSelectedFinderItems, List } from "@raycast/api";
import { useEffect, useState } from "react";
import { FilesForm } from "./components/FilesForm";
import { RecipientList } from "./components/RecipientList";

type Stage =
  { kind: "loading" } | { kind: "files"; files: string[] } | { kind: "pick"; reason?: string; initialFiles?: string[] };

/**
 * Send Files with Blip.
 * Uses the Finder selection when Finder is in front; otherwise shows a file picker.
 */
export default function Command() {
  const [stage, setStage] = useState<Stage>({ kind: "loading" });

  useEffect(() => {
    getSelectedFinderItems()
      .then((items) => {
        const files = items.map((i) => i.path.replace(/\/$/, ""));
        setStage(
          files.length > 0
            ? { kind: "files", files }
            : { kind: "pick", reason: "Nothing is selected in Finder. Choose what to send." },
        );
      })
      .catch(() => setStage({ kind: "pick", reason: "Finder is not the active app. Choose what to send." }));
  }, []);

  if (stage.kind === "loading") return <List isLoading searchBarPlaceholder="Reading Finder selection…" />;
  if (stage.kind === "pick") return <FilesForm reason={stage.reason} initialFiles={stage.initialFiles} />;
  return (
    <RecipientList files={stage.files} onChangeFiles={() => setStage({ kind: "pick", initialFiles: stage.files })} />
  );
}
