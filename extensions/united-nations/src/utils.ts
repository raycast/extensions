import { useEffect } from "react";
import { LaunchType, confirmAlert, getPreferenceValues, open } from "@raycast/api";
import { getVoices, killRunningSay, say } from "mac-say";
import { crossLaunchCommand } from "raycast-cross-extension";
import { useCachedState } from "@raycast/utils";
import { recommendVoices } from "./constants.js";
import { i18n } from "./i18n.js";
import { LanguageCode } from "./types.js";

export const textToSpeech = async (text: string, voice?: string) => {
  await killRunningSay();
  try {
    await crossLaunchCommand({
      name: "typeToSay",
      type: LaunchType.Background,
      extensionName: "say",
      ownerOrAuthorName: "litomore",
      arguments: {
        content: text,
      },
      context: {
        sayOptions: {
          voice,
        },
      },
    });
  } catch {
    const confirm = await confirmAlert({
      title: i18n.externalExtensionRequired.title,
      message: i18n.externalExtensionRequired.message,
    });
    if (confirm) open("raycast://extensions/litomore/say");
  }
};

export const validateVoice = async (voice: string) => {
  try {
    const emptyContent = " ";
    await say(emptyContent, { voice, skipRunningCheck: true });
    return voice;
  } catch {
    return undefined;
  }
};

export const useVoice = (languageCode: LanguageCode) => {
  const { detechSystemVoiceSettings } = getPreferenceValues<Preferences>();
  const [voice, setVoice] = useCachedState<string>(`${languageCode}-voice`, "");
  const loadVoices = async () => {
    if (!detechSystemVoiceSettings) {
      setVoice("");
      return;
    }
    const installedVoices = await getVoices();
    const possibleVoices = installedVoices.filter((v) => v.languageCode.startsWith(languageCode)).map((v) => v.name);
    const recommendedVoices = recommendVoices[languageCode];
    const voices = await Promise.all([...recommendedVoices, ...possibleVoices].map(validateVoice));
    const validVoice = voices.filter(Boolean).at(0);
    setVoice(validVoice ?? "");
  };
  useEffect(() => {
    loadVoices();
  }, []);
  return voice || undefined;
};
