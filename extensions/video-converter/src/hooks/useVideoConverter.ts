import { useState, useEffect } from "react";
import { getSelectedFinderItems, getFrontmostApplication, showToast, Toast } from "@raycast/api";
import path from "path";
import os from "os";
import { loadSettings, saveSettings, defaultSettings } from "../utils/settings";
import { isFFmpegInstalled } from "../utils/ffmpeg";
import type { FormValues } from "../types";
import { AVAILABLE_VIDEO_FORMATS, AVAILABLE_AUDIO_FORMATS } from "../types";

// ------------------------------------
// Constants
// ------------------------------------
const DEFAULT_SETTINGS: FormValues = {
  videoFormat: "mp4",
  videoCodec: "h264",
  compressionMode: "bitrate",
  preset: "medium",
  bitrate: "10000",
  maxSize: "100",
  audioBitrate: "128",
  outputFolder: [path.join(os.homedir(), "Downloads")],
  rename: "",
  subfolderName: "",
  useHardwareAcceleration: false,
  deleteOriginalFiles: false,
  videoFiles: [],
  audioFiles: [],
};

// ------------------------------------
// Helpers
// ------------------------------------
const filterByExtensions = (paths: string[], extensions: readonly string[]): string[] => {
  return paths.filter((p) => extensions.some((ext) => p.toLowerCase().endsWith(`.${ext}`)));
};

const isInteger = (value: string): boolean => /^\d+$/.test(value);
const isNumber = (value: string): boolean => /^\d+(\.\d+)?$/.test(value);

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

  if (data.compressionMode === "bitrate" && !isInteger(data.bitrate)) {
    showToast({
      style: Toast.Style.Failure,
      title: "Invalid Bitrate",
      message: "Bitrate must be a whole number.",
    });
    return false;
  }

  if (data.compressionMode === "filesize" && !isNumber(data.maxSize)) {
    showToast({
      style: Toast.Style.Failure,
      title: "Invalid File Size",
      message: "Max size must be a number.",
    });
    return false;
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
      const settings = isQuickConvert ? DEFAULT_SETTINGS : await loadSettings();
      setFormData(settings);

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
    };

    setIsFfmpegInstalled(isFFmpegInstalled());
    initializeForm();
  }, [isQuickConvert]);

  const handleChange = <K extends keyof FormValues>(key: K, value: FormValues[K]): void => {
    setFormData((prev: FormValues | null) => {
      if (!prev) return null;

      // If output folder is empty, revert to saved/default folder
      if (key === "outputFolder" && Array.isArray(value) && value.length === 0) {
        return {
          ...prev,
          [key]: [path.join(os.homedir(), "Downloads")],
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
    const defaults = await loadSettings();
    setFormData(defaults);
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
