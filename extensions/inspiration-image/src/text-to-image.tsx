import {
  Action,
  ActionPanel,
  Detail,
  getSelectedText,
  showToast,
  Toast,
} from "@raycast/api";
import { useEffect, useState } from "react";
import fs from "node:fs/promises";
import BackgroundPicker from "./lib/background-picker";
import { imageMarkdown } from "./lib/preview";
import { runNativeBridge } from "./lib/native-bridge";
import { saveTemporaryImage } from "./lib/storage";

type Phase = "loading" | "select-background" | "result" | "error";

export default function TextToImage() {
  const [phase, setPhase] = useState<Phase>("loading");
  const [selectedText, setSelectedText] = useState("");
  const [imagePath, setImagePath] = useState("");
  const [error, setError] = useState("");

  async function readSelection() {
    setPhase("loading");
    try {
      const text = (await getSelectedText()).trim();
      setSelectedText(text);
      setError(
        text
          ? ""
          : "No text is selected in the frontmost app. Select some text and run this command again.",
      );
      setPhase(text ? "select-background" : "error");
    } catch {
      setError(
        "Could not read the selected text. Return to the app, select some text, and run this command again.",
      );
      setPhase("error");
    }
  }

  useEffect(() => {
    void readSelection();
  }, []);

  useEffect(() => {
    return () => {
      if (imagePath) void fs.rm(imagePath, { force: true });
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
    try {
      await runNativeBridge("share-image", imagePath);
    } catch (cause) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Could Not Open the Share Sheet",
        message: String(cause),
      });
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
    return <Detail isLoading markdown="Reading selected text…" />;

  if (phase === "error") {
    return (
      <Detail
        markdown={`## Could Not Start\n\n${error}`}
        actions={
          <ActionPanel>
            <Action title="Read Selected Text Again" onAction={readSelection} />
          </ActionPanel>
        }
      />
    );
  }

  if (phase === "select-background") {
    return (
      <BackgroundPicker
        source={{ kind: "text", text: selectedText }}
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
