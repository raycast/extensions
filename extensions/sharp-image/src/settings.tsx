import { Action, ActionPanel, Form, showToast, Toast, LocalStorage } from "@raycast/api";
import { useState, useEffect } from "react";
import { getSharpPaths } from "./utils/image";

interface Settings {
  webpQuality: string;
  avifQuality: string;
  jpegQuality: string;
  overwriteOriginal: boolean;
}

const STORAGE_KEY = "sharp-image-settings";

async function loadSettings(): Promise<Settings> {
  const stored = await LocalStorage.getItem<string>(STORAGE_KEY);
  if (stored) {
    return JSON.parse(stored);
  }
  return {
    webpQuality: "80",
    avifQuality: "65",
    jpegQuality: "85",
    overwriteOriginal: false,
  };
}

async function saveSettings(settings: Settings): Promise<void> {
  await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

export default function Command() {
  const [isLoading, setIsLoading] = useState(true);
  const [webpQuality, setWebpQuality] = useState("80");
  const [avifQuality, setAvifQuality] = useState("65");
  const [jpegQuality, setJpegQuality] = useState("85");
  const [overwriteOriginal, setOverwriteOriginal] = useState(false);

  const paths = getSharpPaths();

  useEffect(() => {
    loadSettings().then((settings) => {
      setWebpQuality(settings.webpQuality);
      setAvifQuality(settings.avifQuality);
      setJpegQuality(settings.jpegQuality);
      setOverwriteOriginal(settings.overwriteOriginal);
      setIsLoading(false);
    });
  }, []);

  async function handleSubmit() {
    const settings: Settings = {
      webpQuality,
      avifQuality,
      jpegQuality,
      overwriteOriginal,
    };

    await saveSettings(settings);
    await showToast({ style: Toast.Style.Success, title: "Settings saved" });
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Settings" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description title="Sharp CLI" text={`Node: ${paths.node}\nSharp: ${paths.sharp}`} />

      <Form.Separator />

      <Form.TextField
        id="webpQuality"
        title="WebP Quality"
        placeholder="1-100"
        value={webpQuality}
        onChange={setWebpQuality}
        info="Higher value = better quality, larger file"
      />

      <Form.TextField
        id="avifQuality"
        title="AVIF Quality"
        placeholder="1-100"
        value={avifQuality}
        onChange={setAvifQuality}
        info="Higher value = better quality, larger file"
      />

      <Form.TextField
        id="jpegQuality"
        title="JPEG Quality"
        placeholder="1-100"
        value={jpegQuality}
        onChange={setJpegQuality}
        info="Higher value = better quality, larger file"
      />

      <Form.Separator />

      <Form.Checkbox
        id="overwriteOriginal"
        label="Overwrite original file"
        value={overwriteOriginal}
        onChange={setOverwriteOriginal}
        info="When enabled, replaces the original file instead of creating a new one with hash suffix"
      />
    </Form>
  );
}
