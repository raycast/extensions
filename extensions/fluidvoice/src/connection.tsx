import { Action, ActionPanel, Detail, Icon } from "@raycast/api";
import { useEffect, useState } from "react";
import { FluidVoiceAPI } from "./api/fluidVoice";

export default function Command() {
  const [markdown, setMarkdown] = useState<string>();
  async function check() {
    setMarkdown(undefined);
    try {
      const health = await FluidVoiceAPI.health();
      setMarkdown(
        `# FluidVoice ${health.version}\n\nLocal API: ${health.status}\n\nTranscription uses the currently selected speech model.`,
      );
    } catch (error) {
      setMarkdown(
        `# Connection failed\n\n${error instanceof Error ? error.message : String(error)}\n\nEnable Local API in FluidVoice settings and check its port.`,
      );
    }
  }
  useEffect(() => {
    void check();
  }, []);
  return (
    <Detail
      isLoading={markdown === undefined}
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action title="Check Again" icon={Icon.RotateClockwise} onAction={check} />
        </ActionPanel>
      }
    />
  );
}
