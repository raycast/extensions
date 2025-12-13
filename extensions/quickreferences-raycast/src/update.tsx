import { Detail, Toast, showToast } from "@raycast/api";
import { useEffect, useState } from "react";
import { ReferenceUpdater } from "./services/updater";
import { DatasetMeta } from "./types";

const updater = new ReferenceUpdater();

export default function UpdateReferences() {
  const [status, setStatus] = useState<string>("Downloading latest dataset...");
  const [meta, setMeta] = useState<DatasetMeta | undefined>();
  const [error, setError] = useState<string | undefined>();

  useEffect(() => {
    const run = async () => {
      const toast = await showToast({
        style: Toast.Style.Animated,
        title: "Updating references",
        message: "Downloading",
      });

      try {
        const dataset = await updater.update();
        setMeta(dataset.meta);
        setStatus("Update complete. Bundled data refreshed.");
        toast.style = Toast.Style.Success;
        toast.title = "References updated";
        toast.message = `${dataset.meta.total} cheat sheets`;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        setError(message);
        setStatus("Update failed.");
        toast.style = Toast.Style.Failure;
        toast.title = "Update failed";
        toast.message = message;
      }
    };

    run();
  }, []);

  return <Detail markdown={buildMarkdown(status, meta, error)} />;
}

function buildMarkdown(status: string, meta?: DatasetMeta, error?: string): string {
  if (error) {
    return `# QuickReferences Update\n\n❌ ${status}\n\n\`\`\`\n${error}\n\`\`\``;
  }

  if (!meta) {
    return `# QuickReferences Update\n\n${status}`;
  }

  return `# QuickReferences Update\n\n✅ ${status}\n\n- Generated at: ${meta.generatedAt}\n- Source: ${meta.source}\n- Total cheat sheets: ${meta.total}\n`;
}
