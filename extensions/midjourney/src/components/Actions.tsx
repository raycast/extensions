import { Action, Icon, Keyboard, useNavigation } from "@raycast/api";
import { MJOptions } from "midjourney";
import { useGenerationContext } from "../contexts/GenerationContext";
import { useSelectedGenerationContext } from "../contexts/SelectedGenerationContext";
import { Details } from "../details";
import copyFileToClipboard from "../lib/copyFileToClipboard";
import saveImage from "../lib/saveImage";
import { Generation } from "../types";

export function GenerateAction({ onGenerate, shortcut }: { onGenerate: () => void; shortcut?: Keyboard.Shortcut }) {
  return (
    <Action
      title="Generate Image"
      icon={Icon.Image}
      shortcut={shortcut || { modifiers: ["cmd"], key: "g" }}
      onAction={onGenerate}
    />
  );
}

export function OpenInBrowserAction({ id }: { id: string }) {
  return (
    <Action.OpenInBrowser
      url={`https://www.midjourney.com/app/jobs/${id}/`}
      shortcut={{ modifiers: ["cmd", "shift"], key: "b" }}
      title="Open in Browser"
    />
  );
}

interface ImageValues {
  url: string;
  id: string;
}

export function CopyImageToClipboardAction({ imageValues }: { imageValues: ImageValues }) {
  return (
    <Action
      title="Copy to Clipboard"
      icon={Icon.Clipboard}
      shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
      onAction={() => copyFileToClipboard(imageValues)}
    />
  );
}

export function DownloadImageAction({ imageValues }: { imageValues: ImageValues }) {
  return (
    <Action
      title="Download Image"
      icon={Icon.HardDrive}
      shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
      onAction={() => saveImage(imageValues)}
    />
  );
}

export function MidjourneyActions({ option }: { option: MJOptions }) {
  switch (option.label) {
    case "U1":
      return <UpscaleAction target={1} />;
    case "U2":
      return <UpscaleAction target={2} />;
    case "U3":
      return <UpscaleAction target={3} />;
    case "U4":
      return <UpscaleAction target={4} />;
    case "V1":
      return <VariationAction target={1} />;
    case "V2":
      return <VariationAction target={2} />;
    case "V3":
      return <VariationAction target={3} />;
    case "V4":
      return <VariationAction target={4} />;
    case "🔄":
      return <RerollAction />;
    case "Vary (Strong)":
      return <VaryAction option={option} />;
    case "Vary (Subtle)":
      return <VaryAction option={option} />;
    case "Zoom Out 2x":
      return <ZoomOutAction strength={2} options={option} />;
    case "Zoom Out 1.5x":
      return <ZoomOutAction strength={1.5} options={option} />;
    default:
      return null;
  }
}

function RerollAction() {
  const { createGeneration } = useGenerationContext();
  const { selectedGeneration } = useSelectedGenerationContext();
  const { push } = useNavigation();

  return (
    <Action
      title={`Reroll`}
      icon={Icon.Repeat}
      shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
      onAction={async () => {
        createGeneration(selectedGeneration.prompt, (gen) => {
          if (gen.guid) {
            push(<Details selectedId={gen.guid} />);
          }
        });
      }}
    />
  );
}

function UpscaleAction({ target }: { target: number }) {
  const { createUpscale } = useGenerationContext();
  const { selectedGeneration } = useSelectedGenerationContext();
  const { push } = useNavigation();

  return (
    <Action
      title={`Upscale ${target}`}
      icon={Icon.PlusSquare}
      shortcut={{ modifiers: ["cmd", "opt"], key: String(target) as "1" | "2" | "3" | "4" }}
      onAction={async () => {
        createUpscale(selectedGeneration, target as 1 | 2 | 3 | 4, (newGen) => {
          if (newGen.guid) {
            push(<Details selectedId={newGen.guid} />);
          }
        });
      }}
    />
  );
}

function VariationAction({ target }: { target: number }) {
  const { createVariation } = useGenerationContext();
  const { selectedGeneration } = useSelectedGenerationContext();
  const { push } = useNavigation();

  return (
    <Action
      title={`Variation ${target}`}
      icon={Icon.Shuffle}
      shortcut={{ modifiers: ["cmd", "ctrl"], key: String(target) as "1" | "2" | "3" | "4" }}
      onAction={async () => {
        createVariation(selectedGeneration, target as 1 | 2 | 3 | 4, (gen) => {
          if (gen.guid) {
            push(<Details selectedId={gen.guid} />);
          }
        });
      }}
    />
  );
}

function VaryAction({ option }: { option: MJOptions }) {
  const { createVary } = useGenerationContext();
  const { selectedGeneration } = useSelectedGenerationContext();
  const { push } = useNavigation();

  return (
    <Action
      title={option.label}
      icon={Icon.Shuffle}
      onAction={async () => {
        createVary(selectedGeneration, option, (gen) => {
          if (gen.guid) {
            push(<Details selectedId={gen.guid} />);
          }
        });
      }}
    />
  );
}

function ZoomOutAction({ strength, options }: { strength: number; options: MJOptions }) {
  const { createZoomOut } = useGenerationContext();
  const { selectedGeneration } = useSelectedGenerationContext();
  const { push } = useNavigation();

  return (
    <Action
      // eslint-disable-next-line @raycast/prefer-title-case
      title={`Zoom Out ${strength}x`}
      icon={Icon.MagnifyingGlass}
      shortcut={{ modifiers: ["cmd", "shift"], key: String(Math.floor(strength)) as "1" | "2" }}
      onAction={async () => {
        createZoomOut(selectedGeneration, strength, options, (gen) => {
          if (gen.guid) {
            push(<Details selectedId={gen.guid} />);
          }
        });
      }}
    />
  );
}

export function RemoveAction({ generation }: { generation: Generation }) {
  const { removeGeneration } = useGenerationContext();

  return (
    <Action
      title="Remove"
      icon={Icon.Trash}
      shortcut={{ modifiers: ["cmd", "shift"], key: "delete" }}
      onAction={async () => {
        removeGeneration(generation);
      }}
    />
  );
}
