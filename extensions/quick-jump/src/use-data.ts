import { getPreferenceValues } from "@raycast/api";
import fs from "fs";
import os from "os";
import path from "path";
import { useEffect, useState, useRef, useCallback } from "react";
import { Root, Preferences } from "./types";
import { ERROR_MESSAGES } from "./constants";
import { validateConfiguration, ValidationResult } from "./validation";

export function useData() {
  const [data, setData] = useState<Root | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);

  const lastFileStats = useRef<{ mtime: number; size: number } | null>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const preferences = getPreferenceValues<Preferences>();
      let filePath = preferences.jsonFilePath;

      if (!filePath) {
        throw new Error("JSON file path is not configured. Please set it in extension preferences.");
      }

      if (filePath.startsWith("~")) {
        filePath = path.join(os.homedir(), filePath.slice(1));
      }

      if (!fs.existsSync(filePath)) {
        throw new Error(`${ERROR_MESSAGES.FILE_NOT_FOUND} Path: ${filePath}`);
      }

      const fileStats = fs.statSync(filePath);
      const currentFileStats = { mtime: fileStats.mtime.getTime(), size: fileStats.size };

      const fileContent = fs.readFileSync(filePath, "utf-8");
      if (!fileContent.trim()) {
        throw new Error(ERROR_MESSAGES.EMPTY_FILE);
      }

      const jsonData = JSON.parse(fileContent) as Root;

      if (!jsonData.groups || !jsonData.urls || !jsonData.templates) {
        throw new Error(ERROR_MESSAGES.INVALID_CONFIG);
      }

      const validation = validateConfiguration(jsonData);
      setValidationResult(validation);
      lastFileStats.current = currentFileStats;
      setData(jsonData);
    } catch (err) {
      console.error("Failed to load configuration:", err);

      if (err instanceof Error) {
        setError(err);
      } else {
        setError(new Error(ERROR_MESSAGES.UNKNOWN_ERROR));
      }
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const triggerValidation = useCallback(() => {
    if (data) {
      const validation = validateConfiguration(data);
      setValidationResult(validation);
    }
  }, [data]);

  return { data, loading, error, validationResult, triggerValidation, reloadData: loadData };
}
