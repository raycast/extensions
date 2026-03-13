import { errorUtils, ToastType } from "./errors.utils";
import { fileUtils } from "./file.utils";
import { preferenceUtils } from "./preference.utils";
import { soxUtils } from "./sox.utils";

export type Converters = {
  slowed: Converter;
  reverb: Converter;
  slowedAndReverb: Converter;
  nightcore: Converter;
};

export type Converter = {
  command: (args: { inputPath: string; outputPath: string; slowedSpeed?: string; nightcoreSpeed?: string }) => string[];
  fileNameSuffix: "slowed" | "reverb" | "slowed-reverb" | "nightcore";
  initialToast: ToastType;
  successToast: ToastType;
};

const converters: Converters = {
  slowed: {
    command: ({ inputPath, outputPath, slowedSpeed }) => [
      "-N",
      "-V1",
      "--ignore-length",
      "-G",
      inputPath,
      "-C",
      "320",
      "-r",
      "44100",
      "-b",
      "24",
      "-c",
      "2",
      outputPath,
      "speed",
      slowedSpeed || "1.0",
    ],
    fileNameSuffix: "slowed",
    initialToast: {
      title: "slowing down without reverb",
      emoji: "🐢",
    },
    successToast: {
      title: "slowed down completed",
      emoji: "🎉",
    },
  },
  reverb: {
    command: ({ inputPath, outputPath }) => [
      "-N",
      "-V1",
      "--ignore-length",
      "-G",
      inputPath,
      "-C",
      "320",
      "-r",
      "44100",
      "-b",
      "24",
      "-c",
      "2",
      outputPath,
      "reverb",
      "50",
      "50",
      "100",
      "100",
      "20",
      "0",
    ],
    fileNameSuffix: "reverb",
    initialToast: {
      title: "adding reverb",
      emoji: "📢",
    },
    successToast: {
      title: "reverb completed",
      emoji: "🎉",
    },
  },
  slowedAndReverb: {
    command: ({ inputPath, outputPath, slowedSpeed }) => [
      "-N",
      "-V1",
      "--ignore-length",
      "-G",
      inputPath,
      "-C",
      "320",
      "-r",
      "44100",
      "-b",
      "24",
      "-c",
      "2",
      outputPath,
      "speed",
      slowedSpeed || "1.0",
      "reverb",
      "50",
      "50",
      "100",
      "100",
      "20",
      "0",
    ],
    fileNameSuffix: "slowed-reverb",
    initialToast: {
      title: "slowing down + adding reverb",
      emoji: "🪩",
    },
    successToast: {
      title: "slowed + reverb completed",
      emoji: "🎉",
    },
  },
  nightcore: {
    command: ({ inputPath, outputPath, nightcoreSpeed }) => [
      "-N",
      "-V1",
      "--ignore-length",
      "-G",
      inputPath,
      "-C",
      "320",
      "-r",
      "44100",
      "-b",
      "24",
      "-c",
      "2",
      outputPath,
      "speed",
      nightcoreSpeed || "1.0",
    ],
    fileNameSuffix: "nightcore",
    initialToast: {
      title: "converting to nightcore",
      emoji: "🌙",
    },
    successToast: {
      title: "nightcore completed",
      emoji: "🎉",
    },
  },
};

const converter = async (
  inputPath: string,
  converter: Converter["command"],
  fileNameSuffix: Converter["fileNameSuffix"],
) => {
  const { getOutputPath } = fileUtils;
  const { executeSoxCommand } = soxUtils;
  const { getAllDefaultSpeeds } = preferenceUtils;
  const speeds = getAllDefaultSpeeds();
  const outputPath = getOutputPath(inputPath, fileNameSuffix);
  const { throwError, CONSTANTS } = errorUtils;

  try {
    const args = converter({
      inputPath,
      outputPath,
      slowedSpeed: speeds.slowed,
      nightcoreSpeed: speeds.nightcore,
    });

    await executeSoxCommand(args);
  } catch (error) {
    await errorUtils.showToastError(error);
    throwError(CONSTANTS.conversionFailed);
  }
};

export const convertersUtils = {
  converters,
  converter,
};
