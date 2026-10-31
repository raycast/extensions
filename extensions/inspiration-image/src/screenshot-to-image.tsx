import { Action, ActionPanel, Detail, showToast, Toast } from "@raycast/api";
import { useCallback, useEffect, useRef, useState } from "react";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import BackgroundPicker from "./lib/background-picker";
import { imageMarkdown } from "./lib/preview";
import { discardPreview, retainPreview } from "./lib/preview-files";
import { runNativeBridge } from "./lib/native-bridge";
import { saveTemporaryImage } from "./lib/storage";

type Phase = "loading" | "select-background" | "result" | "error";

export default function ScreenshotToImage() {
  const [phase, setPhase] = useState<Phase>("loading");
  const [inputPath, setInputPath] = useState("");
  const [imagePath, setImagePath] = useState("");
  const [error, setError] = useState("");
  const inputPathRef = useRef("");

  const loadClipboardImage = useCallback(async () => {
    setPhase("loading");
    setError("");
    const nextPath = path.join(
      os.tmpdir(),
      `inspiration-input-${Date.now()}.png`,
    );
    try {
      await runNativeBridge("read-clipboard-image", nextPath);
      if (inputPathRef.current)
        await fs.rm(inputPathRef.current, { force: true });
      inputPathRef.current = nextPath;
      setInputPath(nextPath);
      setPhase("select-background");
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "The clipboard does not contain an image.",
      );
      setPhase("error");
    }
  }, []);

  useEffect(() => {
    void loadClipboardImage();
    return () => {
      if (inputPathRef.current)
        void fs.rm(inputPathRef.current, { force: true });
    };
  }, [loadClipboardImage]);

  useEffect(() => {
    return () => {
      if (imagePath) discardPreview(imagePath);
    };
  }, [imagePath]);

  async function importToPhotos() {
    try {
      await runNativeBridge("import-photos", imagePath);
      await showToast({
        style: Toast.Style.Success,
        title: "Imported to Apple Photos",
      });
    } catch (cause) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Could Not Import to Photos",
        message: String(cause),
      });
    }
  }

  async function share() {
    const release = retainPreview(imagePath);
    try {
      await runNativeBridge("share-image", imagePath);
    } catch (cause) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Could Not Open the Share Sheet",
        message: String(cause),
      });
    } finally {
      release();
    }
  }

  async function saveToPictures() {
    try {
      const savedPath = await saveTemporaryImage(imagePath);
      await showToast({
        style: Toast.Style.Success,
        title: "Saved to Pictures",
        message: savedPath,
      });
    } catch (cause) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Could Not Save Image",
        message: String(cause),
      });
    }
  }

  if (phase === "loading")
    return <Detail isLoading markdown="Reading clipboard screenshot…" />;

  if (phase === "error") {
    return (
      <Detail
        markdown={`## Could Not Start\n\n${error}`}
        actions={
          <ActionPanel>
            <Action
              title="Read Clipboard Image Again"
              onAction={loadClipboardImage}
            />
          </ActionPanel>
        }
      />
    );
  }

  if (phase === "select-background") {
    return (
      <BackgroundPicker
        source={{ kind: "screenshot", path: inputPath }}
        onCreated={(path) => {
          setImagePath(path);
          setPhase("result");
        }}
      />
    );
  }

  return (
    <Detail
      markdown={imageMarkdown(imagePath)}
      actions={
        <ActionPanel>
          <Action
            title="Choose Another Background"
            onAction={() => setPhase("select-background")}
          />
          <Action title="Save to Pictures" onAction={saveToPictures} />
          <Action title="Import to Apple Photos" onAction={importToPhotos} />
          <Action title="Share…" onAction={share} />
        </ActionPanel>
      }
    />
  );
}
