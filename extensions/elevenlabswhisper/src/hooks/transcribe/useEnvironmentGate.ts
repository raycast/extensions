import { useEffect, useMemo, useState } from "react";
import { getPreferenceValues, openExtensionPreferences } from "@raycast/api";
import { audioService, SoxError } from "../../services/audio.service";
import type { Preferences } from "../../types/preferences";
import type { SystemCheckResult, SystemCheckState } from "./types";

const normalizeError = (error: unknown): SoxError => {
  if (error instanceof SoxError) {
    return error;
  }

  return new SoxError("Audio service check failed.", "SOX_CHECK_FAILED", error);
};

export const useEnvironmentGate = () => {
  const [checkState, setCheckState] = useState<SystemCheckState>({
    status: "pending",
  });

  useEffect(() => {
    // React components can unmount before the async check resolves (e.g., user closes the command).
    // The cleanup sets this flag so the async callback skips setState after unmount, avoiding warnings/leaks.
    let cancelled = false;

    const runCheck = async () => {
      try {
        await audioService.ensureSoxAvailable();
        if (!cancelled) {
          setCheckState({ status: "ok" });
        }
      } catch (error) {
        if (!cancelled) {
          setCheckState({ status: "error", error: normalizeError(error) });
        }
      }
    };

    void runCheck();

    return () => {
      cancelled = true;
    };
  }, []);

  const result = useMemo<SystemCheckResult>(() => {
    const prefs = getPreferenceValues<Preferences>();
    const provider = prefs.provider ?? "elevenlabs";

    if (provider === "elevenlabs" && !prefs.elevenlabsApiKey?.trim()) {
      return {
        hasError: true,
        title: "API Key Required",
        message: "ElevenLabs API Key is missing. Please configure it in preferences.",
        solution: "Open extension preferences and add your ElevenLabs API key",
        action: "Open Preferences",
        actionHandler: openExtensionPreferences,
      };
    }

    if (provider === "ai302" && !prefs.ai302ApiKey?.trim()) {
      return {
        hasError: true,
        title: "API Key Required",
        message: "302.ai API Key is missing. Please configure it in preferences.",
        solution: "Open extension preferences and add your 302.ai API key",
        action: "Open Preferences",
        actionHandler: openExtensionPreferences,
      };
    }

    switch (checkState.status) {
      case "pending":
        return {
          hasError: true,
          title: "Checking Audio Dependencies",
          message: "Please wait while we verify the SoX executable.",
          solution: "No action required. This will finish automatically.",
        };
      case "error": {
        const code = checkState.error?.code;

        switch (code) {
          case "SOX_NOT_FOUND":
            return {
              hasError: true,
              title: "SoX Not Found",
              message: "SoX executable could not be located. Install it or set its absolute path in preferences.",
              solution: "Install via `brew install sox`, then configure the executable path if needed.",
              action: "Open Preferences",
              actionHandler: openExtensionPreferences,
            };
          case "PREF_NOT_ABSOLUTE":
            return {
              hasError: true,
              title: "Invalid SoX Path",
              message: "The configured SoX executable path must be absolute.",
              solution: "Update the SoX path in preferences to an absolute path.",
              action: "Open Preferences",
              actionHandler: openExtensionPreferences,
            };
          default:
            return {
              hasError: true,
              title: "SoX Unavailable",
              message: checkState.error?.message ?? "Failed to execute SoX.",
              solution: "Run `sox --version` in Terminal to verify installation and permissions.",
            };
        }
      }
      default:
        return { hasError: false };
    }
  }, [checkState]);

  return { checkState, result };
};
