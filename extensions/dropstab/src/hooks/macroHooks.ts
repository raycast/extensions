import { useState, useEffect } from "react";
import { showToast, Toast } from "@raycast/api";
import fetch from "node-fetch";
import { MacroData } from "../types/macroType";

export function useMacroData() {
  const [macroData, setMacroData] = useState<MacroData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchMacroData() {
      try {
        const response = await fetch("https://dropscapital.com/api/widgets/");
        const data = await response.json();
        setMacroData(data as MacroData);
      } catch (error) {
        showToast(Toast.Style.Failure, "Failed to fetch macro data");
      } finally {
        setIsLoading(false);
      }
    }

    fetchMacroData();
  }, []);

  return { macroData, isLoading };
}
