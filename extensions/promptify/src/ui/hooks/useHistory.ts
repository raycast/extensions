import { useState, useCallback } from "react";
import { StorageManager } from "../../core/storage";
import { HistoryItem } from "../../core/types";
import { generateId } from "../../utils/helpers";

export function useHistory() {
  const [isSaving, setIsSaving] = useState(false);

  const saveToHistory = useCallback(
    async (
      input: string,
      output: string,
      presetId: string,
      metadata: {
        provider: string;
        model?: string;
        processingTime: number;
      },
    ): Promise<string> => {
      setIsSaving(true);

      try {
        const historyItem: Omit<HistoryItem, "id" | "timestamp"> = {
          presetId,
          input,
          output,
          metadata,
        };

        const id = await StorageManager.saveToHistory(historyItem);
        return id;
      } finally {
        setIsSaving(false);
      }
    },
    [],
  );

  const exportAsJson = useCallback((input: string, output: string, presetId: string) => {
    const exportData = {
      id: generateId("export"),
      timestamp: Date.now(),
      presetId,
      input,
      output,
      exported_at: new Date().toISOString(),
    };

    return JSON.stringify(exportData, null, 2);
  }, []);

  return {
    saveToHistory,
    exportAsJson,
    isSaving,
  };
}
