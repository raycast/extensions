import { showToast, Toast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useState, useEffect } from "react";
import { organizeTemp } from "./lib/organizer";
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
          title: "Organizing Temp Folder...",
        });

        const organizationResult = await organizeTemp(undoManager);
        setResult(organizationResult);

        await showToast({
          style: Toast.Style.Success,
          title: "Temp Folder organized!",
        });
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        setError(errorMessage);

        await showFailureToast("Failed to organize Temp Folder", { message: errorMessage });
      } finally {
        setIsLoading(false);
      }
    }

    organize();
  }, [undoManager]);

  if (isLoading) {
    return null; // Toast will show loading state
  }

  if (error || !result) {
    return null; // Toast will show error
  }

  return <ResultView result={result} location="Temp Folder" undoManager={undoManager} />;
}
