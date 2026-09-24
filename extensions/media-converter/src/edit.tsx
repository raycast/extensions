import { useEffect, useMemo, useRef, useState } from "react";
import { Action, ActionPanel, Form, Icon, Toast, getSelectedFinderItems, showInFinder, showToast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import path from "node:path";
import { EDIT_FRAME_RATES, editMedia, type EditRequest } from "./utils/editMedia";
import { getMediaType } from "./types/media";

type Operation = EditRequest["operation"];

export default function Command() {
  const [files, setFiles] = useState<string[]>([]);
  const [operation, setOperation] = useState<Operation>("resize-crop");
  const [width, setWidth] = useState("");
  const [height, setHeight] = useState("");
  const [cropWidth, setCropWidth] = useState("");
  const [cropHeight, setCropHeight] = useState("");
  const [cropX, setCropX] = useState("0");
  const [cropY, setCropY] = useState("0");
  const [speed, setSpeed] = useState("1.25");
  const [speedFrameRate, setSpeedFrameRate] = useState("original");
  const [frameRate, setFrameRate] = useState("30");
  const [removeAudio, setRemoveAudio] = useState(false);
  const [audioFormat, setAudioFormat] = useState<".mp3" | ".m4a" | ".wav" | ".flac">(".mp3");
  const [integratedLufs, setIntegratedLufs] = useState("-16");
  const [subtitleMode, setSubtitleMode] = useState<"burn" | "remove">("burn");
  const [subtitleFiles, setSubtitleFiles] = useState<string[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const abortController = useRef<AbortController | null>(null);
  const isVideoInput = getMediaType(path.extname(files[0] ?? "")) === "video";

  useEffect(() => {
    getSelectedFinderItems()
      .then((items) => setFiles(items.map((item) => item.path).slice(0, 1)))
      .catch(() => undefined);
    return () => abortController.current?.abort();
  }, []);

  const request = useMemo<EditRequest>(() => {
    if (operation === "resize-crop") {
      return {
        operation,
        width: optionalNumber(width),
        height: optionalNumber(height),
        cropWidth: optionalNumber(cropWidth),
        cropHeight: optionalNumber(cropHeight),
        cropX: optionalNumber(cropX),
        cropY: optionalNumber(cropY),
      };
    }
    if (operation === "speed") {
      return {
        operation,
        speed: Number(speed),
        frameRate: isVideoInput && speedFrameRate !== "original" ? Number(speedFrameRate) : undefined,
        removeAudio: isVideoInput && removeAudio,
      };
    }
    if (operation === "frame-rate") return { operation, frameRate: Number(frameRate), removeAudio };
    if (operation === "remove-audio") return { operation };
    if (operation === "extract-audio") return { operation, audioFormat };
    if (operation === "normalize") return { operation, integratedLufs: Number(integratedLufs) };
    return { operation, mode: subtitleMode, subtitlePath: subtitleFiles[0] };
  }, [
    operation,
    width,
    height,
    cropWidth,
    cropHeight,
    cropX,
    cropY,
    speed,
    speedFrameRate,
    frameRate,
    removeAudio,
    isVideoInput,
    audioFormat,
    integratedLufs,
    subtitleMode,
    subtitleFiles,
  ]);

  const submit = async () => {
    if (isEditing || files.length === 0) return;
    const controller = new AbortController();
    abortController.current = controller;
    setIsEditing(true);
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: `Editing ${path.basename(files[0])}…`,
      primaryAction: { title: "Cancel Edit", onAction: () => controller.abort() },
    });
    try {
      const output = await editMedia(files[0], request, {
        signal: controller.signal,
        onProgress: (progress) => {
          toast.title = `Editing · ${Math.floor(progress.percent)}%`;
        },
      });
      await toast.hide();
      await showToast({
        style: Toast.Style.Success,
        title: "Edit completed",
        message: path.basename(output),
        primaryAction: { title: "Show Output", onAction: () => showInFinder(output) },
      });
    } catch (error) {
      await toast.hide();
      if (controller.signal.aborted) await showToast({ style: Toast.Style.Failure, title: "Edit cancelled" });
      else await showFailureToast(error, { title: "Edit failed" });
    } finally {
      abortController.current = null;
      setIsEditing(false);
    }
  };

  return (
    <Form
      actions={
        <ActionPanel>
          {isEditing ? (
            <Action
              title="Cancel Edit"
              icon={Icon.XMarkCircle}
              shortcut={{ modifiers: ["cmd"], key: "." }}
              onAction={() => abortController.current?.abort()}
            />
          ) : (
            <Action.SubmitForm title="Edit Media" icon={Icon.Pencil} onSubmit={submit} />
          )}
        </ActionPanel>
      }
    >
      <Form.FilePicker
        id="input"
        title="Input"
        allowMultipleSelection={false}
        value={files}
        onChange={(next) => setFiles(next.slice(0, 1))}
      />
      <Form.Dropdown
        id="operation"
        title="Operation"
        value={operation}
        onChange={(value) => setOperation(value as Operation)}
      >
        <Form.Dropdown.Item value="resize-crop" title="Resize / Crop" />
        <Form.Dropdown.Item value="speed" title="Change Speed" />
        <Form.Dropdown.Item value="frame-rate" title="Change Frame Rate" />
        <Form.Dropdown.Item value="remove-audio" title="Remove Audio" />
        <Form.Dropdown.Item value="extract-audio" title="Extract Audio" />
        <Form.Dropdown.Item value="normalize" title="Normalize Audio" />
        <Form.Dropdown.Item value="subtitles" title="Subtitles" />
      </Form.Dropdown>
      {operation === "resize-crop" && (
        <>
          <Form.Description text="Resize dimensions are optional. For crop, enter both width and height." />
          <Form.TextField id="width" title="Resize Width" placeholder="e.g. 1280" value={width} onChange={setWidth} />
          <Form.TextField id="height" title="Resize Height" placeholder="Auto" value={height} onChange={setHeight} />
          <Form.TextField id="cropWidth" title="Crop Width" value={cropWidth} onChange={setCropWidth} />
          <Form.TextField id="cropHeight" title="Crop Height" value={cropHeight} onChange={setCropHeight} />
          <Form.TextField id="cropX" title="Crop X" value={cropX} onChange={setCropX} />
          <Form.TextField id="cropY" title="Crop Y" value={cropY} onChange={setCropY} />
        </>
      )}
      {operation === "speed" && (
        <Form.TextField id="speed" title="Playback Speed" placeholder="0.25 to 40" value={speed} onChange={setSpeed} />
      )}
      {(operation === "frame-rate" || (operation === "speed" && isVideoInput)) && (
        <>
          <Form.Dropdown
            id="frameRate"
            title="Output Frame Rate"
            value={operation === "speed" ? speedFrameRate : frameRate}
            onChange={operation === "speed" ? setSpeedFrameRate : setFrameRate}
          >
            {operation === "speed" && <Form.Dropdown.Item value="original" title="Keep Original" />}
            {EDIT_FRAME_RATES.map((rate) => (
              <Form.Dropdown.Item key={rate} value={String(rate)} title={`${rate} fps`} />
            ))}
          </Form.Dropdown>
          <Form.Checkbox
            id="removeAudio"
            label="Remove audio from the output video"
            value={removeAudio}
            onChange={setRemoveAudio}
          />
        </>
      )}
      {operation === "remove-audio" && (
        <Form.Description text="Save a new MP4 video without audio. To also change speed or frame rate, use those operations and enable Remove Audio." />
      )}
      {operation === "extract-audio" && (
        <Form.Dropdown
          id="audioFormat"
          title="Audio Format"
          value={audioFormat}
          onChange={(value) => setAudioFormat(value as typeof audioFormat)}
        >
          {[".mp3", ".m4a", ".wav", ".flac"].map((format) => (
            <Form.Dropdown.Item key={format} value={format} title={format} />
          ))}
        </Form.Dropdown>
      )}
      {operation === "normalize" && (
        <Form.TextField
          id="integratedLufs"
          title="Integrated Loudness"
          placeholder="-16"
          value={integratedLufs}
          onChange={setIntegratedLufs}
          info="-16 LUFS works well for podcasts; -14 LUFS is common for streaming."
        />
      )}
      {operation === "subtitles" && (
        <>
          <Form.Dropdown
            id="subtitleMode"
            title="Subtitle Action"
            value={subtitleMode}
            onChange={(value) => setSubtitleMode(value as typeof subtitleMode)}
          >
            <Form.Dropdown.Item value="burn" title="Burn Into Video" />
            <Form.Dropdown.Item value="remove" title="Remove Subtitle Streams" />
          </Form.Dropdown>
          {subtitleMode === "burn" && (
            <Form.FilePicker
              id="subtitle"
              title="Subtitle File"
              allowMultipleSelection={false}
              value={subtitleFiles}
              onChange={(next) => setSubtitleFiles(next.slice(0, 1))}
            />
          )}
        </>
      )}
    </Form>
  );
}

function optionalNumber(value: string): number | undefined {
  return value.trim() === "" ? undefined : Number(value);
}
