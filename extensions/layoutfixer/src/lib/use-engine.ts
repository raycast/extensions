import { showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import { Engine, loadEngine } from "./engine";

export function useEngine(): Engine | undefined {
  const [engine, setEngine] = useState<Engine>();
  useEffect(() => {
    loadEngine()
      .then(setEngine)
      .catch((error: Error) =>
        showToast({ style: Toast.Style.Failure, title: "Couldn't load", message: error.message }),
      );
  }, []);
  return engine;
}
