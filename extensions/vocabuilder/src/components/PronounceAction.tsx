import { Action, Icon, Keyboard, Toast, getPreferenceValues, showToast } from "@raycast/api";
import { useEffect, useRef } from "react";
import { hasMacOsFallback, isTtsSupported, pronounce, pronounceFallback } from "../lib/tts";

interface PronounceActionProps {
  word: string;
  languageCode: string;
  title?: string;
  shortcut: Keyboard.Shortcut;
}

export default function PronounceAction({ word, languageCode, title, shortcut }: PronounceActionProps) {
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  if (!isTtsSupported(languageCode)) return null;

  async function handlePronounce() {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const toast = await showToast({ style: Toast.Style.Animated, title: "Playing pronunciation…" });
    try {
      const { geminiApiKey } = getPreferenceValues<Preferences.Translate>();
      const { cached } = await pronounce(word, geminiApiKey, languageCode, controller.signal);
      if (!cached) toast.title = "Generated pronunciation";
      toast.hide();
    } catch (err) {
      if (controller.signal.aborted) return;
      const reason = err instanceof Error ? err.message : String(err);
      if (!hasMacOsFallback(languageCode)) {
        toast.style = Toast.Style.Failure;
        toast.title = "Pronunciation failed";
        toast.message = reason === "NETWORK_OFFLINE" ? "No internet connection" : "Could not generate audio";
        return;
      }
      toast.title = "Using system voice…";
      try {
        await pronounceFallback(word, languageCode);
        toast.hide();
      } catch {
        toast.style = Toast.Style.Failure;
        toast.title = "Pronunciation failed";
        toast.message = "Could not play audio";
      }
    }
  }

  return (
    <Action title={title ?? "Pronounce Word"} icon={Icon.SpeakerHigh} shortcut={shortcut} onAction={handlePronounce} />
  );
}
