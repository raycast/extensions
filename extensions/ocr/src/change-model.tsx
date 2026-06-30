import { List, popToRoot } from "@raycast/api";
import { useEffect, useState } from "react";

import { ModelPicker, SetupView } from "./setup";
import { getSetupGate } from "./setup-config";
import type { OcrSetupConfig } from "./types";

export default function Command() {
  const [setupConfig, setSetupConfig] = useState<OcrSetupConfig>();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadSetup(): Promise<void> {
      const gate = await getSetupGate();
      setSetupConfig(gate.kind === "ready" ? gate.config : undefined);
      setIsLoading(false);
    }

    void loadSetup();
  }, []);

  if (isLoading) {
    return <List isLoading />;
  }

  if (!setupConfig) {
    return (
      <SetupView
        onSaved={() => {
          void popToRoot();
        }}
      />
    );
  }

  return (
    <ModelPicker
      existingConfig={setupConfig}
      currentModelId={setupConfig.model}
      onSaved={() => {
        void popToRoot();
      }}
    />
  );
}
