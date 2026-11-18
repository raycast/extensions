import { useEffect, useState } from "react";
import { Action, Icon, open } from "@raycast/api";
import { systemDefault } from "../constants.js";
import { checkIfSayIsRunning, killRunningSay, say } from "../speech.js";
import { getConfigureSpeechTitle, getSystemSettingsUrl, useSaySettings } from "../utils.js";

export const ConfigureSpokenContent = () => (
  <Action
    icon={{ source: "spoken-content.png" }}
    title={getConfigureSpeechTitle()}
    onAction={() => {
      open(getSystemSettingsUrl());
    }}
  ></Action>
);

export const TextToSpeech = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const { voice, rate, device } = useSaySettings();

  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setTimeout>;
    const checkRunning = async () => {
      try {
        const isRunning = await checkIfSayIsRunning();
        if (active) setIsPlaying(Boolean(isRunning));
      } finally {
        if (active) timer = setTimeout(() => void checkRunning().catch(() => {}), 1000);
      }
    };
    void checkRunning().catch(() => {});
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, []);

  if (isPlaying) {
    return (
      <Action
        icon={Icon.Stop}
        style={Action.Style.Destructive}
        title="Stop Saying"
        onAction={async () => {
          try {
            await killRunningSay();
          } catch {
            // Handle error gracefully
          }
        }}
      />
    );
  }

  return (
    <Action.SubmitForm
      icon={Icon.SpeechBubbleActive}
      title="Say"
      onSubmit={async (values) => {
        await say(values.content, {
          voice: voice === systemDefault ? undefined : voice,
          rate: rate === systemDefault ? undefined : parseInt(rate, 10),
          audioDevice: device === systemDefault ? undefined : device,
        });
      }}
    />
  );
};
