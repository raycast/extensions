import { Action, Icon, Keyboard, Toast, getPreferenceValues, showToast } from "@raycast/api";
import { useEffect, useRef } from "react";
import { hasMacOsFallback, isTtsSupported, pronounce, pronounceFallback } from "../lib/tts";
import { getPreferenceDefault } from "../lib/manifest";
import { runPronounceWithFallback } from "../lib/pronounceFlow";
import { routeTtsError } from "../lib/ttsErrorRouter";

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
    const { geminiApiKey, ttsModelPreset, ttsModel } = getPreferenceValues<Preferences>();
    const model = ttsModel?.trim() || ttsModelPreset || getPreferenceDefault("ttsModelPreset");

    const outcome = await runPronounceWithFallback({
      signal: controller.signal,
      attemptPrimary: () => pronounce(word, geminiApiKey, languageCode, controller.signal, model),
      attemptFallback: hasMacOsFallback(languageCode) ? () => pronounceFallback(word, languageCode) : null,
      routeError: (err) => routeTtsError(err, languageCode),
    });

    switch (outcome.kind) {
      case "primary":
        if (!outcome.cached) toast.title = "Generated pronunciation";
        await toast.hide();
        return;
      case "aborted":
        await toast.hide();
        return;
      case "fallback-ok":
        await toast.hide();
        await showToast({ style: Toast.Style.Success, title: "Using system voice", message: outcome.message });
        return;
      case "failed":
        await toast.hide();
        await showToast({ style: Toast.Style.Failure, title: outcome.title, message: outcome.message });
        return;
    }
  }

  return (
    <Action title={title ?? "Pronounce Word"} icon={Icon.SpeakerHigh} shortcut={shortcut} onAction={handlePronounce} />
  );
}
