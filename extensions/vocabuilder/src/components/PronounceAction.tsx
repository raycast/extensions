import { Action, Icon, Keyboard, Toast, getPreferenceValues, showToast } from "@raycast/api";
import { useEffect, useRef } from "react";
import { hasMacOsFallback, planPronunciation, pronounce, pronounceFallback } from "../lib/tts";
import { runPronounceWithFallback, runSystemVoice } from "../lib/pronounceFlow";
import { routeTtsError } from "../lib/ttsErrorRouter";
import { createPronunciationSession } from "../lib/pronunciationSession";

interface PronounceActionProps {
  word: string;
  languageCode: string;
  title?: string;
  shortcut: Keyboard.Shortcut;
}

export default function PronounceAction({ word, languageCode, title, shortcut }: PronounceActionProps) {
  const session = useRef(createPronunciationSession()).current;

  useEffect(() => {
    return () => {
      session.cancel();
    };
  }, [session]);

  const plan = planPronunciation(languageCode, getPreferenceValues<Preferences>());
  if (plan.kind === "unavailable") return null;

  const handlePronounce = async () => {
    const signal = session.start();
    try {
      const toast = await showToast({ style: Toast.Style.Animated, title: "Playing pronunciation…" });

      const outcome =
        plan.kind === "system"
          ? await runSystemVoice({
              signal,
              attempt: () => pronounceFallback(word, languageCode, signal),
            })
          : await runPronounceWithFallback({
              signal,
              attemptPrimary: () =>
                plan.kind === "provider"
                  ? pronounce(word, languageCode, plan.config, signal)
                  : Promise.reject(plan.error),
              attemptFallback: hasMacOsFallback(languageCode)
                ? () => pronounceFallback(word, languageCode, signal)
                : null,
              routeError: (err) => routeTtsError(err, languageCode),
            });

      switch (outcome.kind) {
        case "primary":
          if (!outcome.cached) toast.title = "Generated pronunciation";
          await toast.hide();
          return;
        case "system":
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
    } finally {
      session.finish(signal);
    }
  };

  return (
    <Action title={title ?? "Pronounce Word"} icon={Icon.SpeakerHigh} shortcut={shortcut} onAction={handlePronounce} />
  );
}
