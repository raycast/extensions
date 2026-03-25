import {
  Action,
  ActionPanel,
  Form,
  LocalStorage,
  Toast,
  open,
  showToast,
} from "@raycast/api";
import { spawn } from "child_process";
import { access, stat } from "fs/promises";
import path from "path";
import { useEffect, useState } from "react";

type Values = {
  file: string[];
  outputFolder?: string[];
  crf: string;
  preset: string;
  codec: "h264" | "h265";
  scale: string;
  accel: "cpu" | "nvidia" | "amd" | "intel";
  ffmpegPath?: string;
  useRecommended: boolean;
};

const PRESETS = [
  "ultrafast",
  "superfast",
  "veryfast",
  "faster",
  "fast",
  "medium",
  "slow",
  "slower",
  "veryslow",
];

const STORAGE_KEY = "ffmpegPath";
const CRF_MIN = 0;
const CRF_MAX = 51;
const DEFAULT_CRF = "23";
const CODECS: Array<{
  value: Values["codec"];
  label: string;
  encoder: string;
}> = [
  { value: "h264", label: "H.264 (libx264)", encoder: "libx264" },
  { value: "h265", label: "H.265 (libx265)", encoder: "libx265" },
];
const SCALE_PRESETS: Array<{ value: string; label: string; filter?: string }> =
  [
    { value: "none", label: "No scale" },
    { value: "4k-1080", label: "4K → 1080p", filter: "scale=1920:1080" },
    { value: "1080-720", label: "1080p → 720p", filter: "scale=1280:720" },
    { value: "720-480", label: "720p → 480p", filter: "scale=854:480" },
  ];
const ACCEL_ORDER: Array<Values["accel"]> = ["nvidia", "amd", "intel"];
const ACCEL_LABELS: Record<Values["accel"], string> = {
  cpu: "CPU (software)",
  nvidia: "NVIDIA (NVENC)",
  amd: "AMD (AMF)",
  intel: "Intel (QSV)",
};

function getScaleLabel(value: Values["scale"]) {
  return SCALE_PRESETS.find((preset) => preset.value === value)?.label ?? value;
}

type Recommendation = {
  crf: number;
  preset: Values["preset"];
  scale: Values["scale"];
  accel: Values["accel"];
  tier: "low" | "medium" | "high" | "ultra";
};

async function fileExists(filePath: string) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function checkFfmpegOnPath() {
  return new Promise<boolean>((resolve) => {
    const process = spawn("ffmpeg", ["-version"], { windowsHide: true });

    process.on("error", () => resolve(false));
    process.on("exit", (code) => resolve(code === 0));
  });
}

function parseFraction(value?: string) {
  if (!value) {
    return null;
  }

  const [numerator, denominator] = value.split("/").map(Number);
  if (!Number.isFinite(numerator)) {
    return null;
  }

  if (!Number.isFinite(denominator) || denominator === 0) {
    return numerator;
  }

  return numerator / denominator;
}

function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return "0 B";
  }

  const units = ["B", "KB", "MB", "GB", "TB"];
  const index = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1,
  );
  const value = bytes / Math.pow(1024, index);

  return `${value.toFixed(value >= 100 ? 0 : value >= 10 ? 1 : 2)} ${units[index]}`;
}

function formatBitrate(bitrate?: number) {
  if (!bitrate || !Number.isFinite(bitrate)) {
    return "unknown";
  }

  return `${Math.round(bitrate / 1000)} kbps`;
}

function formatDuration(seconds?: number) {
  if (!seconds || !Number.isFinite(seconds)) {
    return "";
  }

  const totalSeconds = Math.max(0, Math.round(seconds));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const remainingSeconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(remainingSeconds).padStart(2, "0")}`;
  }

  return `${minutes}:${String(remainingSeconds).padStart(2, "0")}`;
}

function getFfprobePath(ffmpegPath: string) {
  if (ffmpegPath === "ffmpeg") {
    return "ffprobe";
  }

  return path.join(path.dirname(ffmpegPath), "ffprobe.exe");
}

async function detectEncoders(ffmpegPath: string) {
  return new Promise<Set<string>>((resolve, reject) => {
    const process = spawn(ffmpegPath, ["-hide_banner", "-encoders"], {
      windowsHide: true,
    });
    let stdout = "";
    let stderr = "";

    process.stdout.on("data", (data) => {
      stdout += data.toString();
    });

    process.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    process.on("error", (error) => reject(error));
    process.on("close", (code) => {
      if (code !== 0) {
        reject(
          new Error(stderr || `ffmpeg -encoders exited with code ${code}`),
        );
        return;
      }

      const encoderSet = new Set<string>();
      const encoderRegex =
        /(h264_nvenc|hevc_nvenc|h264_amf|hevc_amf|h264_qsv|hevc_qsv)/g;
      let match: RegExpExecArray | null;
      while ((match = encoderRegex.exec(stdout)) !== null) {
        encoderSet.add(match[1]);
      }

      resolve(encoderSet);
    });
  });
}

async function detectGpuVendors() {
  return new Promise<Set<Values["accel"]>>((resolve) => {
    const process = spawn(
      "powershell",
      [
        "-NoProfile",
        "-Command",
        "Get-CimInstance Win32_VideoController | Select-Object -ExpandProperty Name",
      ],
      { windowsHide: true },
    );
    let stdout = "";

    process.stdout.on("data", (data) => {
      stdout += data.toString();
    });

    process.on("close", () => {
      const vendors = new Set<Values["accel"]>();
      const normalized = stdout.toLowerCase();
      if (normalized.includes("nvidia")) {
        vendors.add("nvidia");
      }
      if (normalized.includes("amd") || normalized.includes("radeon")) {
        vendors.add("amd");
      }
      if (normalized.includes("intel")) {
        vendors.add("intel");
      }

      resolve(vendors);
    });

    process.on("error", () => resolve(new Set()));
  });
}

function getAvailableAccels(
  encoderSet: Set<string>,
  gpuVendors: Set<Values["accel"]>,
) {
  const available: Array<Values["accel"]> = ["cpu"];
  const hasNvenc = Array.from(encoderSet).some((encoder) =>
    encoder.includes("_nvenc"),
  );
  const hasAmf = Array.from(encoderSet).some((encoder) =>
    encoder.includes("_amf"),
  );
  const hasQsv = Array.from(encoderSet).some((encoder) =>
    encoder.includes("_qsv"),
  );

  if (hasNvenc && gpuVendors.has("nvidia")) {
    available.push("nvidia");
  }
  if (hasAmf && gpuVendors.has("amd")) {
    available.push("amd");
  }
  if (hasQsv && gpuVendors.has("intel")) {
    available.push("intel");
  }

  return available;
}

function getDefaultAccel(available: Array<Values["accel"]>) {
  for (const accel of ACCEL_ORDER) {
    if (available.includes(accel)) {
      return accel;
    }
  }

  return "cpu";
}

function getEncoderForAccel(
  codec: Values["codec"],
  accel: Values["accel"],
  encoderSet: Set<string>,
) {
  if (accel === "cpu") {
    return CODECS.find((entry) => entry.value === codec)?.encoder ?? "libx264";
  }

  const encoderMap: Record<Values["accel"], Record<Values["codec"], string>> = {
    cpu: { h264: "libx264", h265: "libx265" },
    nvidia: { h264: "h264_nvenc", h265: "hevc_nvenc" },
    amd: { h264: "h264_amf", h265: "hevc_amf" },
    intel: { h264: "h264_qsv", h265: "hevc_qsv" },
  };

  const encoder = encoderMap[accel][codec];
  if (encoderSet.has(encoder)) {
    return encoder;
  }

  return CODECS.find((entry) => entry.value === codec)?.encoder ?? "libx264";
}

function getRecommendedSettings(
  metadata: Awaited<ReturnType<typeof runFfprobe>>,
  availableAccels: Array<Values["accel"]>,
): Recommendation | null {
  if (!metadata.width || !metadata.height) {
    return null;
  }

  const pixels = metadata.width * metadata.height;
  const bitrateKbps = metadata.bitrate ? metadata.bitrate / 1000 : null;
  const isUltra =
    pixels >= 3840 * 2160 || (bitrateKbps !== null && bitrateKbps >= 20000);
  const isHigh =
    pixels >= 1920 * 1080 || (bitrateKbps !== null && bitrateKbps >= 8000);
  const isMedium =
    pixels >= 1280 * 720 || (bitrateKbps !== null && bitrateKbps >= 3500);

  let tier: Recommendation["tier"] = "low";
  if (isUltra) {
    tier = "ultra";
  } else if (isHigh) {
    tier = "high";
  } else if (isMedium) {
    tier = "medium";
  }

  const presetMap: Record<Recommendation["tier"], Values["preset"]> = {
    low: "fast",
    medium: "medium",
    high: "slow",
    ultra: "slow",
  };
  const crfMap: Record<Recommendation["tier"], number> = {
    low: 26,
    medium: 23,
    high: 20,
    ultra: 18,
  };

  const scale = pixels >= 3840 * 2160 ? "4k-1080" : "none";
  const accel = getDefaultAccel(availableAccels);

  return {
    crf: crfMap[tier],
    preset: presetMap[tier],
    scale,
    accel,
    tier,
  };
}

async function runFfprobe(ffprobePath: string, inputPath: string) {
  return new Promise<{
    width?: number;
    height?: number;
    fps?: number;
    codec?: string;
    bitrate?: number;
    duration?: number;
  }>((resolve, reject) => {
    const process = spawn(
      ffprobePath,
      [
        "-v",
        "quiet",
        "-print_format",
        "json",
        "-show_streams",
        "-show_format",
        inputPath,
      ],
      { windowsHide: true },
    );
    let stdout = "";
    let stderr = "";

    process.stdout.on("data", (data) => {
      stdout += data.toString();
    });

    process.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    process.on("error", (error) => reject(error));
    process.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(stderr || `ffprobe exited with code ${code}`));
        return;
      }

      try {
        const payload = JSON.parse(stdout) as {
          streams?: Array<Record<string, string>>;
          format?: { duration?: string; bit_rate?: string };
        };

        const videoStream = payload.streams?.find(
          (stream) => stream.codec_type === "video",
        );
        const duration = payload.format?.duration
          ? Number(payload.format.duration)
          : undefined;
        const bitrate = videoStream?.bit_rate
          ? Number(videoStream.bit_rate)
          : payload.format?.bit_rate
            ? Number(payload.format.bit_rate)
            : undefined;
        const fps =
          parseFraction(
            videoStream?.r_frame_rate ??
              videoStream?.avg_frame_rate ??
              undefined,
          ) ?? undefined;

        resolve({
          width: videoStream?.width ? Number(videoStream.width) : undefined,
          height: videoStream?.height ? Number(videoStream.height) : undefined,
          codec: videoStream?.codec_name ?? undefined,
          fps,
          bitrate: bitrate && Number.isFinite(bitrate) ? bitrate : undefined,
          duration:
            duration && Number.isFinite(duration) ? duration : undefined,
        });
      } catch (error) {
        reject(error);
      }
    });
  });
}

async function runFfmpegWithProgress(
  ffmpegPath: string,
  args: string[],
  durationSeconds: number | undefined,
  onProgress: (message: string) => void,
) {
  return new Promise<void>((resolve, reject) => {
    const process = spawn(ffmpegPath, args, { windowsHide: true });
    let stderr = "";
    let stdoutBuffer = "";
    let lastUpdate = 0;
    const latestProgress: Record<string, string> = {};

    const updateToast = () => {
      const outTimeMs = Number(latestProgress.out_time_ms);
      const fps = latestProgress.fps;
      const speed = latestProgress.speed;
      let percent = "";
      let remaining = "";

      if (durationSeconds && Number.isFinite(outTimeMs)) {
        const totalMs = durationSeconds * 1000 * 1000;
        const progressValue = Math.min(outTimeMs / totalMs, 1);
        percent = `${Math.round(progressValue * 100)}%`;
        const remainingSeconds = durationSeconds - outTimeMs / 1_000_000;
        remaining = formatDuration(remainingSeconds);
      }

      const messageParts = [
        percent,
        remaining ? `remaining ${remaining}` : null,
        fps ? `${fps} fps` : null,
        speed ? speed : null,
      ].filter(Boolean);
      if (messageParts.length > 0) {
        onProgress(messageParts.join(" · "));
      }
    };

    process.stdout.on("data", (data) => {
      stdoutBuffer += data.toString();
      const lines = stdoutBuffer.split(/\r?\n/);
      stdoutBuffer = lines.pop() ?? "";

      for (const line of lines) {
        const [key, value] = line.split("=");
        if (key && value !== undefined) {
          latestProgress[key.trim()] = value.trim();
        }
        if (key === "progress" && value === "end") {
          updateToast();
        }
      }

      const now = Date.now();
      if (now - lastUpdate > 500) {
        lastUpdate = now;
        updateToast();
      }
    });

    process.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    process.on("error", (error) => reject(error));
    process.on("close", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(stderr || `FFmpeg exited with code ${code}`));
    });
  });
}

export default function Command() {
  const [storedFfmpegPath, setStoredFfmpegPath] = useState<string | null>(null);
  const [requiresFfmpegPath, setRequiresFfmpegPath] = useState(false);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [crfValue, setCrfValue] = useState(DEFAULT_CRF);
  const [presetValue, setPresetValue] = useState<Values["preset"]>("medium");
  const [scaleValue, setScaleValue] = useState<Values["scale"]>("none");
  const [accelValue, setAccelValue] = useState<Values["accel"]>("cpu");
  const [useRecommendedValue, setUseRecommendedValue] = useState(true);
  const [accelOptions, setAccelOptions] = useState<
    Array<{ value: Values["accel"]; label: string }>
  >([{ value: "cpu", label: ACCEL_LABELS.cpu }]);
  const [defaultAccel, setDefaultAccel] = useState<Values["accel"]>("cpu");
  const [gpuVendors, setGpuVendors] = useState<Set<Values["accel"]>>(new Set());
  const [isDetectingEncoders, setIsDetectingEncoders] = useState(false);
  const [recommendation, setRecommendation] = useState<Recommendation | null>(
    null,
  );
  const [recommendedDefaults, setRecommendedDefaults] = useState<{
    crf: string;
    preset: Values["preset"];
    scale: Values["scale"];
    accel: Values["accel"];
  } | null>(null);

  const recommendationSummary = recommendation
    ? `Recommended: CRF ${recommendation.crf} · preset ${recommendation.preset} · scale ${getScaleLabel(
        recommendation.scale,
      )} · accel ${ACCEL_LABELS[recommendation.accel]}`
    : null;

  useEffect(() => {
    if (useRecommendedValue && recommendedDefaults) {
      setCrfValue(recommendedDefaults.crf);
      setPresetValue(recommendedDefaults.preset);
      setScaleValue(recommendedDefaults.scale);
      setAccelValue(recommendedDefaults.accel);
    } else if (!useRecommendedValue) {
      setCrfValue(DEFAULT_CRF);
      setPresetValue("medium");
      setScaleValue("none");
      setAccelValue(defaultAccel);
    }
  }, [recommendedDefaults, useRecommendedValue, defaultAccel]);

  useEffect(() => {
    if (!accelOptions.find((option) => option.value === accelValue)) {
      setAccelValue(defaultAccel);
    }
  }, [accelOptions, accelValue, defaultAccel]);

  useEffect(() => {
    const detectRecommendation = async () => {
      if (!selectedFile) {
        setRecommendation(null);
        return;
      }

      const ffmpegOnPath = await checkFfmpegOnPath();
      const resolvedPath = ffmpegOnPath
        ? "ffmpeg"
        : storedFfmpegPath && (await fileExists(storedFfmpegPath))
          ? storedFfmpegPath
          : null;
      if (!resolvedPath) {
        setRecommendation(null);
        return;
      }

      const ffprobePath = getFfprobePath(resolvedPath);
      if (ffprobePath !== "ffprobe" && !(await fileExists(ffprobePath))) {
        setRecommendation(null);
        return;
      }

      try {
        const metadata = await runFfprobe(ffprobePath, selectedFile);
        const availableAccels = accelOptions.map((option) => option.value);
        const recommended = getRecommendedSettings(metadata, availableAccels);
        setRecommendation(recommended);
        if (recommended) {
          setRecommendedDefaults({
            crf: String(recommended.crf),
            preset: recommended.preset,
            scale: recommended.scale,
            accel: recommended.accel,
          });
        }
      } catch {
        setRecommendation(null);
      }
    };

    void detectRecommendation();
  }, [selectedFile, accelOptions, storedFfmpegPath]);

  useEffect(() => {
    const loadStoredPath = async () => {
      const savedPath = await LocalStorage.getItem<string>(STORAGE_KEY);
      if (savedPath) {
        setStoredFfmpegPath(savedPath);
      }

      const ffmpegOnPath = await checkFfmpegOnPath();
      const resolvedPath = ffmpegOnPath
        ? "ffmpeg"
        : savedPath && (await fileExists(savedPath))
          ? savedPath
          : null;

      if (resolvedPath) {
        setRequiresFfmpegPath(false);
        setIsDetectingEncoders(true);
        try {
          const [encoderSet, detectedVendors] = await Promise.all([
            detectEncoders(resolvedPath),
            detectGpuVendors(),
          ]);
          setGpuVendors(detectedVendors);
          const availableAccels = getAvailableAccels(
            encoderSet,
            detectedVendors,
          );
          setAccelOptions(
            availableAccels.map((accel) => ({
              value: accel,
              label: ACCEL_LABELS[accel],
            })),
          );
          const defaultAccelValue = getDefaultAccel(availableAccels);
          setDefaultAccel(defaultAccelValue);
          setRecommendedDefaults((current) =>
            current
              ? {
                  ...current,
                  accel: availableAccels.includes(current.accel)
                    ? current.accel
                    : defaultAccelValue,
                }
              : {
                  crf: DEFAULT_CRF,
                  preset: "medium",
                  scale: "none",
                  accel: defaultAccelValue,
                },
          );
        } catch {
          setAccelOptions([{ value: "cpu", label: ACCEL_LABELS.cpu }]);
          setDefaultAccel("cpu");
          setRecommendedDefaults((current) =>
            current
              ? { ...current, accel: "cpu" }
              : {
                  crf: DEFAULT_CRF,
                  preset: "medium",
                  scale: "none",
                  accel: "cpu",
                },
          );
        } finally {
          setIsDetectingEncoders(false);
        }
        return;
      }

      setRequiresFfmpegPath(true);
      setAccelOptions([{ value: "cpu", label: ACCEL_LABELS.cpu }]);
      setDefaultAccel("cpu");
    };

    void loadStoredPath();
  }, []);

  async function handleSubmit(values: Values) {
    const inputPath = values.file?.[0];
    if (!inputPath) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Select a video file first.",
      });
      return;
    }

    const crfValue = Number(values.crf);
    if (
      !Number.isFinite(crfValue) ||
      crfValue < CRF_MIN ||
      crfValue > CRF_MAX
    ) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Invalid CRF value",
        message: `Use a number between ${CRF_MIN} and ${CRF_MAX}.`,
      });
      return;
    }

    if (!(await fileExists(inputPath))) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Input file not found.",
      });
      return;
    }

    const outputFolder = values.outputFolder?.[0] ?? path.dirname(inputPath);
    const outputPath = path.join(
      outputFolder,
      `${path.parse(inputPath).name}_compressed.mp4`,
    );
    if (await fileExists(outputPath)) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Output already exists",
        message: outputPath,
      });
      return;
    }

    const customPath = values.ffmpegPath?.trim() || storedFfmpegPath?.trim();
    const ffmpegOnPath = await checkFfmpegOnPath();
    const ffmpegPath = ffmpegOnPath ? "ffmpeg" : customPath;

    if (!ffmpegPath) {
      await showToast({
        style: Toast.Style.Failure,
        title: "FFmpeg not found on PATH",
        message: "Provide the full FFmpeg path in the form to continue.",
      });
      return;
    }

    if (ffmpegPath !== "ffmpeg" && !(await fileExists(ffmpegPath))) {
      await showToast({
        style: Toast.Style.Failure,
        title: "FFmpeg path not found",
        message: ffmpegPath,
      });
      return;
    }

    if (ffmpegPath !== "ffmpeg" && ffmpegPath !== storedFfmpegPath) {
      await LocalStorage.setItem(STORAGE_KEY, ffmpegPath);
      setStoredFfmpegPath(ffmpegPath);
      setRequiresFfmpegPath(false);
    }

    let inputMetadata: Awaited<ReturnType<typeof runFfprobe>> | null = null;
    let encoderSet = new Set<string>();
    let detectedVendors = gpuVendors;
    let availableAccels = accelOptions.map((option) => option.value);
    try {
      encoderSet = await detectEncoders(ffmpegPath);
      detectedVendors = detectedVendors.size
        ? detectedVendors
        : await detectGpuVendors();
      setGpuVendors(detectedVendors);
      availableAccels = getAvailableAccels(encoderSet, detectedVendors);
    } catch {
      encoderSet = new Set<string>();
    }
    try {
      const ffprobePath = getFfprobePath(ffmpegPath);
      if (ffprobePath === "ffprobe" || (await fileExists(ffprobePath))) {
        inputMetadata = await runFfprobe(ffprobePath, inputPath);
        const resolution =
          inputMetadata.width && inputMetadata.height
            ? `${inputMetadata.width}x${inputMetadata.height}`
            : "unknown";
        const fps = inputMetadata.fps
          ? `${inputMetadata.fps.toFixed(2)} fps`
          : "unknown fps";
        const codec = inputMetadata.codec ?? "unknown codec";
        const bitrate = formatBitrate(inputMetadata.bitrate);
        const recommended = getRecommendedSettings(
          inputMetadata,
          availableAccels,
        );
        setRecommendation(recommended);
        if (recommended) {
          setRecommendedDefaults({
            crf: String(recommended.crf),
            preset: recommended.preset,
            scale: recommended.scale,
            accel: recommended.accel,
          });
        }
        await showToast({
          style: Toast.Style.Success,
          title: "Input metadata",
          message: `${resolution} · ${fps} · ${codec} · ${bitrate}`,
        });
      }
    } catch (error) {
      setRecommendation(null);
      setRecommendedDefaults((current) =>
        current
          ? {
              crf: DEFAULT_CRF,
              preset: "medium",
              scale: "none",
              accel: current.accel,
            }
          : null,
      );
      await showToast({
        style: Toast.Style.Failure,
        title: "ffprobe failed",
        message:
          error instanceof Error ? error.message : "Metadata unavailable",
      });
    }

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Compressing video",
      message: path.basename(inputPath),
    });

    const shouldUseRecommended = Boolean(
      values.useRecommended && recommendedDefaults,
    );
    const effectiveCrf = shouldUseRecommended
      ? recommendedDefaults!.crf
      : values.crf;
    const effectiveCrfValue = Number(effectiveCrf);
    const effectivePreset = shouldUseRecommended
      ? recommendedDefaults!.preset
      : values.preset;
    const effectiveScale = values.scale;
    let selectedAccel: Values["accel"] = shouldUseRecommended
      ? recommendedDefaults!.accel
      : values.accel;
    let encoder =
      CODECS.find((codec) => codec.value === values.codec)?.encoder ??
      "libx264";

    try {
      const availableAccels = getAvailableAccels(encoderSet, detectedVendors);
      selectedAccel = availableAccels.includes(selectedAccel)
        ? selectedAccel
        : getDefaultAccel(availableAccels);
      encoder = getEncoderForAccel(values.codec, selectedAccel, encoderSet);
      console.log("[debug] available accels", availableAccels);
      console.log("[debug] selected accel", selectedAccel);
      console.log("[debug] encoder", encoder);
      if (selectedAccel !== values.accel) {
        await showToast({
          style: Toast.Style.Animated,
          title: "Acceleration updated",
          message: `Using ${ACCEL_LABELS[selectedAccel]}.`,
        });
      }
      const gpuQualityArgs: Record<Values["accel"], string[]> = {
        cpu: [],
        nvidia: ["-rc", "vbr", "-cq", String(effectiveCrfValue), "-b:v", "0"],
        amd: ["-rc", "cqp", "-qp", String(effectiveCrfValue)],
        intel: ["-global_quality", String(effectiveCrfValue)],
      };
      const qualityArgs =
        selectedAccel === "cpu"
          ? ["-preset", effectivePreset, "-crf", String(effectiveCrfValue)]
          : gpuQualityArgs[selectedAccel];
      if (selectedAccel !== "cpu") {
        await showToast({
          style: Toast.Style.Animated,
          title: "GPU encoder",
          message: `Using ${ACCEL_LABELS[selectedAccel]} quality settings.`,
        });
      }
      console.log("[debug] quality args", qualityArgs);
      const ffmpegArgs = [
        "-i",
        inputPath,
        "-c:v",
        encoder,
        ...qualityArgs,
        "-c:a",
        "copy",
        ...(effectiveScale === "none"
          ? []
          : [
              "-vf",
              SCALE_PRESETS.find((preset) => preset.value === effectiveScale)
                ?.filter ?? "",
            ]),
        "-progress",
        "pipe:1",
        "-nostats",
        outputPath,
      ];
      console.log("[debug] ffmpeg args", ffmpegArgs);
      console.log("[debug] ffmpeg args string", ffmpegArgs.join(" "));

      await runFfmpegWithProgress(
        ffmpegPath,
        ffmpegArgs,
        inputMetadata?.duration,
        (message) => {
          toast.message = message;
        },
      );

      const [inputStats, outputStats] = await Promise.all([
        stat(inputPath),
        stat(outputPath),
      ]);
      const inputSize = inputStats.size;
      const outputSize = outputStats.size;
      const percent =
        inputSize > 0
          ? Math.round(((inputSize - outputSize) / inputSize) * 100)
          : 0;
      const sizeSummary = `${formatBytes(inputSize)} → ${formatBytes(outputSize)} (${percent >= 0 ? "-" : "+"}${Math.abs(
        percent,
      )}%)`;

      await toast.hide();
      await showToast({
        style: Toast.Style.Success,
        title: "Compression complete",
        message: sizeSummary,
      });

      void open(outputFolder);
    } catch (error) {
      console.log("[debug] ffmpeg error", error);
      await showToast({
        style: Toast.Style.Failure,
        title: "Compression failed (debug)",
        message: `Encoder: ${values.codec}/${selectedAccel} (${encoder})`,
      });
      toast.style = Toast.Style.Failure;
      toast.title = "Compression failed";
      toast.message = error instanceof Error ? error.message : "Unknown error";
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.FilePicker
        id="file"
        title="Video File"
        allowMultipleSelection={false}
        info="Pick the source video to compress with FFmpeg."
        onChange={(files) => setSelectedFile(files?.[0] ?? null)}
      />
      {recommendationSummary ? (
        <Form.Description text={recommendationSummary} />
      ) : null}
      <Form.Checkbox
        id="useRecommended"
        label="Use recommended settings"
        value={useRecommendedValue}
        onChange={setUseRecommendedValue}
        info="Auto-apply detected CRF, preset, scale, and acceleration when available."
      />
      <Form.FilePicker
        id="outputFolder"
        title="Output Folder"
        allowMultipleSelection={false}
        canChooseDirectories
        info="Optional. Defaults to the input file's folder."
      />
      <Form.TextField
        id="crf"
        title="CRF"
        placeholder={`${CRF_MIN}-${CRF_MAX}`}
        value={crfValue}
        onChange={setCrfValue}
        info="Quality/size tradeoff. Lower is higher quality, larger file."
      />
      <Form.Dropdown
        id="codec"
        title="Codec"
        defaultValue="h264"
        info="Choose the video codec/encoder family."
      >
        {CODECS.map((codec) => (
          <Form.Dropdown.Item
            key={codec.value}
            value={codec.value}
            title={codec.label}
          />
        ))}
      </Form.Dropdown>
      <Form.Dropdown
        id="accel"
        title="Acceleration"
        value={accelValue}
        onChange={(value) => setAccelValue(value as Values["accel"])}
        isLoading={isDetectingEncoders}
        placeholder={isDetectingEncoders ? "Detecting…" : undefined}
        info="Prefer GPU encoders when available."
      >
        {accelOptions.map((option) => (
          <Form.Dropdown.Item
            key={option.value}
            value={option.value}
            title={option.label}
          />
        ))}
      </Form.Dropdown>
      <Form.Dropdown
        id="scale"
        title="Downscale"
        value={scaleValue}
        onChange={(value) => setScaleValue(value as Values["scale"])}
        info="Optional resize before encoding."
      >
        {SCALE_PRESETS.map((preset) => (
          <Form.Dropdown.Item
            key={preset.value}
            value={preset.value}
            title={preset.label}
          />
        ))}
      </Form.Dropdown>
      <Form.Dropdown
        id="preset"
        title="Preset"
        value={presetValue}
        onChange={(value) => setPresetValue(value as Values["preset"])}
        info="Speed vs compression efficiency (CPU encoders only)."
      >
        {PRESETS.map((preset) => (
          <Form.Dropdown.Item key={preset} value={preset} title={preset} />
        ))}
      </Form.Dropdown>
      <Form.Separator />
      {requiresFfmpegPath ? (
        <>
          <Form.Description text="FFmpeg not found on PATH. Add the full path to ffmpeg.exe." />
          <Form.TextField
            id="ffmpegPath"
            title="FFmpeg Path"
            placeholder="C:\\path\\to\\ffmpeg.exe"
            defaultValue={storedFfmpegPath ?? ""}
            info="Full path to ffmpeg.exe if it's not on PATH."
          />
        </>
      ) : null}
    </Form>
  );
}
