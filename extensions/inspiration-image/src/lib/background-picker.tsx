import {
  Action,
  ActionPanel,
  environment,
  Icon,
  List,
  showToast,
  Toast,
} from "@raycast/api";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { useState } from "react";
import { imageMarkdown, quoteForMarkdown } from "./preview";
import { runNativeBridge } from "./native-bridge";

type ArtworkSource =
  { kind: "text"; text: string } | { kind: "screenshot"; path: string };

type BackgroundPickerProps = {
  source: ArtworkSource;
  onCreated: (imagePath: string) => void;
};

const BACKGROUNDS = [
  {
    id: "memo-lined-cream",
    title: "Lined Memo · Cream",
    subtitle: "Soft yellow ruled paper for text or screenshots",
    file: "memo-lined-cream.png",
  },
  {
    id: "sticky-yellow-blush",
    title: "Yellow Sticky Note · Blush",
    subtitle: "A cheerful yellow note on a warm pink surface",
    file: "sticky-yellow-blush.png",
  },
  {
    id: "memo-periwinkle",
    title: "Periwinkle Memo",
    subtitle: "Soft ruled paper for readable text layouts",
    file: "memo-periwinkle.png",
  },
  {
    id: "memo-mint",
    title: "Mint Memo",
    subtitle: "Fresh pale green ruled paper",
    file: "memo-mint.png",
  },
];

function assetPath(file: string) {
  return path.join(environment.assetsPath, "backgrounds", file);
}

export default function BackgroundPicker({
  source,
  onCreated,
}: BackgroundPickerProps) {
  const [customPath, setCustomPath] = useState("");
  const [isComposing, setIsComposing] = useState(false);

  async function selectCustomBackground() {
    try {
      const selectedPath = await runNativeBridge("choose-background");
      if (selectedPath) setCustomPath(selectedPath);
    } catch (cause) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Could Not Use This Background",
        message: cause instanceof Error ? cause.message : String(cause),
      });
    }
  }

  async function compose(backgroundPath: string) {
    setIsComposing(true);
    const outputPath = path.join(
      os.tmpdir(),
      `inspiration-output-${Date.now()}.png`,
    );
    let textPath = "";
    let completed = false;
    try {
      if (source.kind === "text") {
        textPath = path.join(os.tmpdir(), `inspiration-text-${Date.now()}.txt`);
        await fs.writeFile(textPath, source.text, "utf8");
        await runNativeBridge(
          "compose-text",
          backgroundPath,
          textPath,
          outputPath,
        );
      } else {
        await runNativeBridge(
          "compose-screenshot",
          backgroundPath,
          source.path,
          outputPath,
        );
      }

      await fs.access(outputPath);
      completed = true;
      onCreated(outputPath);
    } catch (cause) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Image Composition Failed",
        message: cause instanceof Error ? cause.message : String(cause),
      });
    } finally {
      setIsComposing(false);
      if (!completed)
        await fs.rm(outputPath, { force: true }).catch(() => undefined);
      if (textPath)
        await fs.rm(textPath, { force: true }).catch(() => undefined);
    }
  }

  const uploadAction = (
    <Action
      title="Choose a Custom Background…"
      icon={Icon.Upload}
      onAction={selectCustomBackground}
    />
  );

  return (
    <List
      isLoading={isComposing}
      isShowingDetail
      navigationTitle="Choose a Background"
      searchBarPlaceholder="Choose a preset or custom image"
    >
      <List.Section title="Foreground Content">
        {source.kind === "text" ? (
          <List.Item
            id="selected-text"
            title="Selected Text Will Be Placed on the Background"
            subtitle={`${source.text.length} characters · Processed on this Mac`}
            icon={Icon.Text}
            detail={
              <List.Item.Detail
                markdown={`## Selected Text\n\n> ${quoteForMarkdown(source.text).replace(/\n/g, "\n> ")}`}
              />
            }
          />
        ) : (
          <List.Item
            id="selected-screenshot"
            title="Screenshot Will Be Placed on the Background"
            subtitle="Screenshot pixels are preserved · Processed on this Mac"
            icon={Icon.AppWindow}
            detail={
              <List.Item.Detail
                markdown={imageMarkdown(source.path, "Clipboard screenshot")}
              />
            }
          />
        )}
      </List.Section>
      <List.Section title="Built-in Backgrounds">
        {BACKGROUNDS.map((background) => {
          const filePath = assetPath(background.file);
          return (
            <List.Item
              key={background.id}
              id={background.id}
              title={background.title}
              subtitle={background.subtitle}
              icon={{ source: filePath }}
              detail={
                <List.Item.Detail
                  markdown={imageMarkdown(filePath, background.title)}
                />
              }
              actions={
                <ActionPanel>
                  <Action
                    title="Compose with This Background"
                    icon={Icon.Check}
                    onAction={() => compose(filePath)}
                  />
                  {uploadAction}
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>
      <List.Section title="Custom Background">
        {customPath ? (
          <List.Item
            id="custom-background"
            title={path.basename(customPath)}
            subtitle="Selected · Stays on this Mac"
            icon={{ source: customPath }}
            detail={
              <List.Item.Detail
                markdown={imageMarkdown(customPath, "Custom background")}
              />
            }
            actions={
              <ActionPanel>
                <Action
                  title="Compose with This Background"
                  icon={Icon.Check}
                  onAction={() => compose(customPath)}
                />
                <Action
                  title="Choose Another Background…"
                  icon={Icon.Upload}
                  onAction={selectCustomBackground}
                />
              </ActionPanel>
            }
          />
        ) : (
          <List.Item
            id="upload-background"
            title="Choose a Custom Background…"
            subtitle="PNG, JPG, or HEIC · At least 1024 × 1024 · Up to 20 MB"
            icon={Icon.Upload}
            detail={
              <List.Item.Detail
                markdown={
                  "Choose an image on this Mac. Square images are recommended; other aspect ratios are center-cropped to fill the canvas."
                }
              />
            }
            actions={<ActionPanel>{uploadAction}</ActionPanel>}
          />
        )}
      </List.Section>
    </List>
  );
}
