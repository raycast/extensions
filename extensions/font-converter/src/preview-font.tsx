import { Action, ActionPanel, Detail, Icon } from "@raycast/api";
import { useEffect, useState } from "react";
import type opentype from "opentype.js";
import { FontFileSelection } from "./components/font-file-selection";
import { loadFont, type FontInfo } from "./lib/fonts";

type PreviewState =
  | { kind: "loading" }
  | { kind: "error"; error: string }
  | { kind: "loaded"; markdown: string; info: FontInfo };

export default function Command() {
  return (
    <FontFileSelection>
      {(filePath, chooseAnotherFile) => <PreviewFont filePath={filePath} chooseAnotherFile={chooseAnotherFile} />}
    </FontFileSelection>
  );
}

function PreviewFont(props: { filePath: string; chooseAnotherFile: () => void }) {
  const [state, setState] = useState<PreviewState>({ kind: "loading" });

  useEffect(() => {
    let active = true;
    async function preview() {
      try {
        const { font, info } = await loadFont(props.filePath);
        const svg = generateSvgPreview(font, [
          "The quick brown fox",
          "jumps over the lazy dog",
          "1234567890",
          "!@#$%^&*()_+",
        ]);
        const dataUri = `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
        if (active) {
          setState({
            kind: "loaded",
            markdown: `# ${escapeMarkdown(info.family)}\n\n![Font preview](${dataUri})`,
            info,
          });
        }
      } catch (error) {
        if (active) setState({ kind: "error", error: error instanceof Error ? error.message : String(error) });
      }
    }
    void preview();
    return () => {
      active = false;
    };
  }, [props.filePath]);

  return (
    <Detail
      isLoading={state.kind === "loading"}
      markdown={
        state.kind === "loaded"
          ? state.markdown
          : state.kind === "error"
            ? `# Could Not Preview Font\n\n${escapeMarkdown(state.error)}`
            : ""
      }
      actions={
        <ActionPanel>
          <Action title="Choose Another Font" icon={Icon.Document} onAction={props.chooseAnotherFile} />
        </ActionPanel>
      }
      metadata={
        state.kind === "loaded" ? (
          <Detail.Metadata>
            <Detail.Metadata.Label title="Font Family" text={state.info.family} />
            <Detail.Metadata.Label title="Sub Family" text={state.info.subfamily} />
            <Detail.Metadata.Label title="Format" text={state.info.format.toUpperCase()} />
            <Detail.Metadata.Label title="Outlines" text={state.info.outlines === "cff" ? "CFF" : "TrueType"} />
            <Detail.Metadata.Label title="Weight" text={String(state.info.weight)} />
            <Detail.Metadata.Label title="Style" text={state.info.style} />
            <Detail.Metadata.Label title="Version" text={state.info.version} />
            <Detail.Metadata.Label title="Copyright" text={state.info.copyright} />
            <Detail.Metadata.Label title="Units Per Em" text={String(state.info.unitsPerEm)} />
            <Detail.Metadata.Label title="Glyphs" text={String(state.info.glyphCount)} />
          </Detail.Metadata>
        ) : undefined
      }
    />
  );
}

function escapeMarkdown(value: string): string {
  return value.replace(/[\\`*_{}[\]()#+.!|>]/g, "\\$&");
}

function generateSvgPreview(font: opentype.Font, lines: string[]): string {
  const fontSize = 48;
  const lineHeight = fontSize * 1.5;
  const width = 800;
  const height = lines.length * lineHeight;
  const paths = lines
    .map((line, index) => font.getPath(line, 0, fontSize + index * lineHeight, fontSize).toSVG(2))
    .join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
  <rect width="${width}" height="${height}" fill="#1e1e2e"/>
  <g fill="#cdd6f4">${paths}</g>
</svg>`;
}
