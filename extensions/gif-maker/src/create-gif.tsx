import { useEffect, useState } from "react";
import { statSync } from "fs";
import { basename } from "path";
import {
  Action,
  ActionPanel,
  Form,
  Toast,
  getPreferenceValues,
  getSelectedFinderItems,
  open,
  popToRoot,
  showInFinder,
  showToast,
} from "@raycast/api";
import {
  Dimensions,
  FfmpegNotFoundError,
  OptimizeLevel,
  convertToGif,
  VIDEO_EXTENSIONS,
  isFfmpegInstalled,
  isVideoFile,
  outputDimensions,
  probeDimensions,
  resolveGifsicle,
} from "./ffmpeg";

/** Sentinel dropdown values that aren't a pixel number. */
const SIZE_ORIGINAL = "original";
const SIZE_CUSTOM = "custom";

const notVideoMessage = `Not a video file. Supported: ${VIDEO_EXTENSIONS.map((extension) => extension.slice(1)).join(", ")}`;

const SIZE_PRESETS = [
  { value: "320", name: "Small" },
  { value: "480", name: "Medium" },
  { value: "800", name: "Large" },
] as const;

interface FormValues {
  files: string[];
  size: string;
  customSize: string;
  fps: string;
  startTime: string;
  duration: string;
  loop: boolean;
  denoise: boolean;
  optimize: string;
  revealInFinder: boolean;
}

export default function Command() {
  const [files, setFiles] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof FormValues, string>>>({});
  const preferences = getPreferenceValues<Preferences.CreateGif>();
  const ffmpegMissing = !isFfmpegInstalled();
  const [size, setSize] = useState("480");
  const [customSize, setCustomSize] = useState("");
  const [source, setSource] = useState<Dimensions>();
  const hasGifsicle = resolveGifsicle() !== undefined;

  // Read the source dimensions so each preset can show its real output size.
  useEffect(() => {
    const path = files[0];
    if (!path) {
      setSource(undefined);
      return;
    }
    let stale = false;
    probeDimensions(path).then((dimensions) => {
      if (!stale) {
        setSource(dimensions);
      }
    });
    return () => {
      stale = true;
    };
  }, [files]);

  const customValue = Number(customSize);
  const customPreview =
    source && Number.isFinite(customValue) && customValue >= 16
      ? (({ width, height }) => `${width} x ${height}`)(outputDimensions(source, Math.round(customValue)))
      : undefined;

  /**
   * "Medium — 270 x 480". Exact dimensions need the source aspect ratio, so
   * before a file is picked the label is just the preset name.
   */
  function sizeTitle(name: string, value: number | "original"): string {
    if (!source) {
      return name;
    }
    const { width, height } = outputDimensions(source, value);
    return `${name} — ${width} x ${height}`;
  }

  // Pre-fill from Finder so the common case is just hitting ⏎.
  useEffect(() => {
    getSelectedFinderItems()
      .then((items) => {
        const video = items.find((item) => isVideoFile(item.path));
        if (video) {
          setFiles([video.path]);
        }
      })
      .catch(() => {
        // Finder isn't frontmost or nothing is selected — the picker still works.
      });
  }, []);

  function setError(field: keyof FormValues, message?: string) {
    setErrors((previous) => ({ ...previous, [field]: message }));
  }

  async function handleSubmit(values: FormValues) {
    const inputPath = values.files[0];
    if (!inputPath) {
      setError("files", "Pick a video file");
      return;
    }
    // Backstop for the same check the picker's onChange runs, in case the form
    // is submitted without the field ever firing onChange.
    if (!isVideoFile(inputPath)) {
      setError("files", notVideoMessage);
      return;
    }

    let maxSize: number | "original";
    if (values.size === SIZE_ORIGINAL) {
      maxSize = "original";
    } else if (values.size === SIZE_CUSTOM) {
      const custom = Number(values.customSize);
      if (!Number.isFinite(custom) || custom < 16 || custom > 4000) {
        setError("customSize", "Enter a size between 16 and 4000 pixels");
        return;
      }
      maxSize = Math.round(custom);
    } else {
      maxSize = Number(values.size);
    }

    const startTime = values.startTime.trim() === "" ? 0 : Number(values.startTime);
    if (!Number.isFinite(startTime) || startTime < 0) {
      setError("startTime", "Enter a non-negative number of seconds");
      return;
    }

    const duration = values.duration.trim() === "" ? undefined : Number(values.duration);
    if (duration !== undefined && (!Number.isFinite(duration) || duration <= 0)) {
      setError("duration", "Enter a positive number of seconds, or leave blank");
      return;
    }

    setIsLoading(true);
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Creating GIF",
      message: basename(inputPath),
    });

    try {
      const outputPath = await convertToGif({
        inputPath,
        maxSize,
        fps: Number(values.fps),
        startTime,
        duration,
        loop: values.loop,
        denoise: values.denoise,
        optimize: values.optimize as OptimizeLevel,
      });

      const sizeMb = statSync(outputPath).size / (1024 * 1024);
      toast.style = Toast.Style.Success;
      toast.title = "GIF created";
      toast.message = `${basename(outputPath)} · ${sizeMb.toFixed(1)} MB`;
      toast.primaryAction = {
        title: "Open GIF",
        onAction: () => open(outputPath),
      };

      if (values.revealInFinder) {
        await showInFinder(outputPath);
      }
      await popToRoot();
    } catch (error) {
      toast.style = Toast.Style.Failure;
      if (error instanceof FfmpegNotFoundError) {
        toast.title = "ffmpeg not found";
        toast.message = "Install it with `brew install ffmpeg`";
      } else {
        toast.title = "Conversion failed";
        toast.message = error instanceof Error ? error.message : String(error);
      }
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create GIF" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      {ffmpegMissing && (
        <Form.Description
          title="⚠️ ffmpeg Required"
          text={
            "This extension needs ffmpeg to convert videos, and it isn't installed.\n\n" +
            "Install it by running this in Terminal:\n\n    brew install ffmpeg\n\n" +
            "Then reopen this command. If ffmpeg is installed somewhere unusual, set its " +
            "full path in this extension's preferences (⌘ ⇧ ,)."
          }
        />
      )}
      {!hasGifsicle && (
        <Form.Description
          title="ℹ️ Compression Unavailable"
          text={
            "The Compression setting needs gifsicle, which isn't installed. GIFs will still be created, " +
            "just larger than they could be.\n\nTo enable it, run this in Terminal:\n\n    brew install gifsicle\n\n" +
            "Then reopen this command."
          }
        />
      )}
      <Form.FilePicker
        id="files"
        title="Video File"
        allowMultipleSelection={false}
        value={files}
        onChange={(newFiles) => {
          setFiles(newFiles);
          // Flag a bad pick immediately rather than waiting for submit; the
          // picker itself can't be limited to video types.
          const picked = newFiles[0];
          setError("files", picked && !isVideoFile(picked) ? notVideoMessage : undefined);
        }}
        error={errors.files}
      />
      <Form.Separator />
      <Form.Dropdown
        // Remount when the probed dimensions arrive so the item titles refresh;
        // Raycast doesn't reliably re-render existing items on a title change.
        key={source ? `size-${source.width}x${source.height}` : "size-unknown"}
        id="size"
        title="Size"
        value={size}
        onChange={setSize}
        info={
          "Longest side of the output, so it means the same for portrait and landscape. " +
          "Biggest lever on file size — halving it roughly quarters the bytes. Never upscales."
        }
      >
        {SIZE_PRESETS.map((preset) => (
          <Form.Dropdown.Item
            key={preset.value}
            value={preset.value}
            title={sizeTitle(preset.name, Number(preset.value))}
          />
        ))}
        <Form.Dropdown.Item value={SIZE_ORIGINAL} title={sizeTitle("Original size", "original")} />
        <Form.Dropdown.Item value={SIZE_CUSTOM} title="Custom…" />
      </Form.Dropdown>
      {size === SIZE_CUSTOM && (
        <Form.TextField
          id="customSize"
          title={customPreview ? `Custom — ${customPreview}` : "Custom Size (px)"}
          placeholder="560"
          value={customSize}
          info="Longest side in pixels, between 16 and 4000. The short side follows the source aspect ratio."
          error={errors.customSize}
          onChange={(next) => {
            setCustomSize(next);
            setError("customSize", undefined);
          }}
        />
      )}
      <Form.Dropdown id="fps" title="Frame Rate" defaultValue="15" info="Higher is smoother but makes a larger file.">
        <Form.Dropdown.Item value="10" title="10 fps" />
        <Form.Dropdown.Item value="15" title="15 fps" />
        <Form.Dropdown.Item value="24" title="24 fps" />
        <Form.Dropdown.Item value="30" title="30 fps" />
      </Form.Dropdown>
      <Form.TextField
        id="startTime"
        title="Start Time"
        placeholder="0"
        info="Seconds into the video to start. Leave blank to start at the beginning."
        error={errors.startTime}
        onChange={() => setError("startTime", undefined)}
      />
      <Form.TextField
        id="duration"
        title="Duration"
        placeholder="Whole video"
        info="Seconds of video to include. Leave blank to run to the end."
        error={errors.duration}
        onChange={() => setError("duration", undefined)}
      />
      <Form.Separator />
      <Form.Dropdown
        id="optimize"
        title="Compression"
        defaultValue="aggressive"
        info={
          hasGifsicle
            ? "Post-processing pass with gifsicle. Aggressive drops the palette to 128 colors and typically saves 22-35%."
            : "Requires gifsicle (`brew install gifsicle`). Without it this setting is ignored."
        }
      >
        <Form.Dropdown.Item value="off" title="Off — largest file, best quality" />
        <Form.Dropdown.Item value="balanced" title="Balanced — ~10% smaller" />
        <Form.Dropdown.Item value="aggressive" title="Aggressive — ~30% smaller (recommended)" />
        <Form.Dropdown.Item value="maximum" title="Maximum — ~45% smaller, visible banding" />
      </Form.Dropdown>
      <Form.Checkbox
        id="denoise"
        label="Reduce grain"
        defaultValue={preferences.defaultDenoise}
        info="Helps on camera footage, where sensor noise can triple the file size. Saves ~16%. Leave off for screen recordings."
      />
      <Form.Checkbox id="loop" label="Loop forever" defaultValue={preferences.defaultLoop} />
      <Form.Checkbox id="revealInFinder" label="Reveal in Finder when done" defaultValue={preferences.defaultReveal} />
    </Form>
  );
}
