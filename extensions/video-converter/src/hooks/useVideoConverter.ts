import { useState, useEffect } from "react";
import { getSelectedFinderItems, getFrontmostApplication, showToast, Toast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import path from "path";
import { loadSettings, saveSettings, defaultSettings } from "../utils/settings";
import { isFFmpegInstalled, setFFmpegPath } from "../utils/ffmpeg";
import type { FormValues } from "../types";
import { AVAILABLE_VIDEO_FORMATS, AVAILABLE_AUDIO_FORMATS } from "../types";

// ------------------------------------
// Helpers
// ------------------------------------
const filterByExtensions = (paths: string[], extensions: readonly string[]): string[] => {
  return paths.filter((p) => extensions.some((ext) => p.toLowerCase().endsWith(`.${ext}`)));
};
const isInteger = (value: string): boolean => /^\d+$/.test(value);
const isNumber = (value: string): boolean => /^\d+(\.\d+)?$/.test(value);
export const sanitizeNumericInput = (value: string): string => {
  const parsedValue = parseInt(value);
  const isNaN = Number.isNaN(parsedValue);
  if (isNaN) {
    showToast({
      style: Toast.Style.Failure,
      title: "Invalid Input",
      message: "Please enter a whole number.",
    });
    return "1";
  }

  return Math.abs(parsedValue).toString();
};

// ------------------------------------
// Validation
// ------------------------------------
const validateForm = (data: FormValues): boolean => {
  if (data.videoFiles.length === 0) {
    showToast({
      style: Toast.Style.Failure,
      title: "No video files selected",
      message: "Select at least one video file.",
    });
    return false;
  }

  if (!data.outputFolder[0]) {
    showToast({
      style: Toast.Style.Failure,
      title: "No output folder",
      message: "Choose an output folder.",
    });
    return false;
  }

  if (data.compressionMode === "bitrate") {
    if (!isInteger(data.bitrate)) {
      showToast({
        style: Toast.Style.Failure,
        title: "Invalid Bitrate",
        message: "Bitrate must be a whole number.",
      });
      return false;
    }
  }

  if (data.compressionMode === "filesize") {
    if (!isNumber(data.maxSize)) {
      showToast({
        style: Toast.Style.Failure,
        title: "Invalid File Size",
        message: "Max size must be a number.",
      });
      return false;
    }
  }

  return true;
};

// ------------------------------------
// Hook
// ------------------------------------
export function useVideoConverter(isQuickConvert: boolean = false) {
  const [formData, setFormData] = useState<FormValues | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isFfmpegInstalled, setIsFfmpegInstalled] = useState(true);

  useEffect(() => {
    const initializeForm = async () => {
      const settings = isQuickConvert ? defaultSettings : await loadSettings();
      setFormData(settings);
      setFFmpegPath();
      try {
        const app = await getFrontmostApplication();
        if (app?.name === "Finder") {
          const items = await getSelectedFinderItems();
          const paths = items.filter((i) => !i.path.endsWith("/")).map((i) => i.path);
          const videoFiles = filterByExtensions(paths, AVAILABLE_VIDEO_FORMATS);

          const parents = [...new Set(videoFiles.map((p) => path.dirname(p)))];
          const isCommonFolder = parents.length === 1;
          const outputFolder = isCommonFolder ? [parents[0]] : settings.outputFolder;

          setFormData((prev: FormValues | null) => ({
            ...(prev || settings),
            videoFiles,
            audioFiles: isQuickConvert ? [] : filterByExtensions(paths, AVAILABLE_AUDIO_FORMATS).slice(0, 1),
            outputFolder,
          }));
        }
      } catch (error) {
        showFailureToast(error, { title: "Failed to get selected files" });
      }
    };

    setIsFfmpegInstalled(isFFmpegInstalled());
    initializeForm();
  }, [isQuickConvert]);

  const handleChange = <K extends keyof FormValues>(key: K, value: FormValues[K]): void => {
    setFormData((prev: FormValues | null) => {
      if (!prev) return null;

      // Handle numeric inputs
      if (key === "bitrate" || key === "maxSize") {
        let stringValue = value as string;
        // Allow typing decimal numbers
        if (stringValue.startsWith(".")) stringValue = "0" + stringValue;
        if (stringValue === "") {
          return { ...prev, [key]: "1" };
        }

        if (stringValue === "." || /^\d*.?\d*$/.test(stringValue)) {
          return { ...prev, [key]: stringValue };
        }
        return prev;
      }

      // If output folder is empty, revert to saved/default folder
      if (key === "outputFolder" && Array.isArray(value) && value.length === 0) {
        return {
          ...prev,
          [key]: defaultSettings.outputFolder,
        };
      }

      return { ...prev, [key]: value };
    });
  };

  const handleSubmit = (values: FormValues): void => {
    if (!validateForm(values)) return;

    showToast({
      style: Toast.Style.Success,
      title: "Conversion started",
      message: `${values.videoFiles.length} file(s)`,
    });
    setIsSubmitted(true);
  };

  const handleSaveDefaults = async (): Promise<void> => {
    if (!formData) return;

    // Create a copy without videoFiles and audioFiles for validation
    const { ...settingsToValidate } = formData;
    settingsToValidate.videoFiles = [];
    settingsToValidate.audioFiles = [];

    if (settingsToValidate.compressionMode === "bitrate" && !isInteger(settingsToValidate.bitrate)) {
      showToast({
        style: Toast.Style.Failure,
        title: "Invalid Bitrate",
        message: "Bitrate must be a whole number to save defaults.",
      });
      return;
    }

    if (settingsToValidate.compressionMode === "filesize" && !isNumber(settingsToValidate.maxSize)) {
      showToast({
        style: Toast.Style.Failure,
        title: "Invalid File Size",
        message: "Max size must be a number to save defaults.",
      });
      return;
    }

    await saveSettings(settingsToValidate);
    showToast({ style: Toast.Style.Success, title: "Defaults saved" });
  };

  const handleResetDefaults = async (): Promise<void> => {
    await saveSettings(defaultSettings);
    setFormData(defaultSettings);
    showToast({ style: Toast.Style.Success, title: "Defaults reset" });
  };

  return {
    formData,
    isSubmitted,
    isFfmpegInstalled,
    handleChange,
    handleSubmit,
    handleSaveDefaults,
    handleResetDefaults,
  };
}
