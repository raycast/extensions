import { useState, useEffect } from "react";
import { showToast, Toast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import type { SessionState, SessionResult, SessionConfig } from "../types";
import { createSessionResult } from "../engine/session";
import { Practice } from "../views/Practice";
import { Result } from "../views/Result";
import { getConfig } from "../storage/prefs";

export default function TypingCommand() {
  const [currentView, setCurrentView] = useState<"practice" | "result">("practice");
  const [sessionResult, setSessionResult] = useState<SessionResult | null>(null);
  const [config, setConfig] = useState<SessionConfig>({
    durationSec: 30,
    difficulty: 2,
    romajiProfile: "hepburn",
    showReading: true,
    practiceMode: "word",
  });

  useEffect(() => {
    const loadConfig = async () => {
      try {
        const userConfig = await getConfig();
        setConfig(userConfig);
      } catch (error) {
        await showFailureToast(error, { title: "Failed to load preferences" });
      }
    };

    loadConfig();
  }, []);

  const handlePracticeComplete = (state: SessionState) => {
    const result: SessionResult = createSessionResult(state);

    setSessionResult(result);
    setCurrentView("result");

    showToast({
      style: Toast.Style.Success,
      title: "Practice Complete!",
      message: `CPM: ${result.cpm}, Accuracy: ${(result.accuracy * 100).toFixed(1)}%, Words: ${result.completedWords}`,
    });
  };

  const handleRestart = () => {
    setSessionResult(null);
    setCurrentView("practice");
  };

  const handleClose = () => {
    process.exit(0);
  };

  if (currentView === "result" && sessionResult) {
    return <Result result={sessionResult} onRestart={handleRestart} onClose={handleClose} />;
  }

  return <Practice config={config} onComplete={handlePracticeComplete} />;
}
