import { showToast, Toast } from "@raycast/api";
import { useState, useEffect } from "react";
import { organizeDownloads } from "./lib/organizer";
import { UndoManager } from "./lib/undoManager";
import { ResultView } from "./components/ResultView";
import type { OrganizationResult } from "./lib/organizer";

export default function Command() {
  const [result, setResult] = useState<OrganizationResult | null>(null);
  const [undoManager] = useState(() => new UndoManager());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function organize() {
      try {
        await showToast({
          style: Toast.Style.Animated,
          title: "Organizing Downloads...",
        });

        const organizationResult = await organizeDownloads(undoManager);
        setResult(organizationResult);

        await showToast({
          style: Toast.Style.Success,
          title: "Downloads organized!",
        });
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        setError(errorMessage);

        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to organize Downloads",
          message: errorMessage,
        });
      } finally {
        setIsLoading(false);
      }
    }

    organize();
  }, []);

  if (isLoading) {
    return null; // Toast will show loading state
  }

  if (error || !result) {
    return null; // Toast will show error
  }

  return <ResultView result={result} location="Downloads" undoManager={undoManager} />;
}
