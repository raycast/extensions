import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { Children, isValidElement, useState, type ReactNode } from "react";
import { Clipboard, Detail, getPreferenceValues, open } from "@raycast/api";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ImagePreview } from "../ImagePreview";
import { renderSvgPreviewRasterWithStrategy } from "../../utils/svg-preview-raster";

vi.mock("react", async (importOriginal) => {
  const react = await importOriginal<typeof import("react")>();
  return {
    ...react,
    useEffect: vi.fn(),
    useRef: (current: unknown) => ({ current }),
    useState: vi.fn(),
  };
});

vi.mock("@raycast/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@raycast/api")>()),
  Clipboard: { copy: vi.fn().mockResolvedValue(undefined) },
  open: vi.fn().mockResolvedValue(undefined),
  getPreferenceValues: vi.fn(),
}));

vi.mock("../../utils/svg-preview-raster", () => ({
  renderSvgPreviewRasterWithStrategy: vi.fn(),
}));

interface ActionProps {
  children?: ReactNode;
  title?: string;
  onAction?: () => Promise<void>;
}

function collectActions(node: ReactNode): ActionProps[] {
  const actions: ActionProps[] = [];
  Children.forEach(node, (child) => {
    if (!isValidElement<ActionProps>(child)) return;
    if (child.props.title) actions.push(child.props);
    actions.push(...collectActions(child.props.children));
  });
  return actions;
}

function setPreviewState(error: string | null) {
  const states: unknown[] = ["data:image/png;base64,preview", error, false, null, null];
  vi.mocked(useState).mockImplementation(() => [states.shift(), vi.fn()]);
}

let directory: string;
const svg = '<svg width="100" height="50"><text>中文</text></svg>';

beforeEach(() => {
  vi.clearAllMocks();
  directory = fs.mkdtempSync(path.join(os.tmpdir(), "image-preview-actions-"));
  vi.mocked(getPreferenceValues).mockReturnValue({ savePath: directory });
});

afterEach(() => {
  vi.restoreAllMocks();
  fs.rmSync(directory, { recursive: true, force: true });
});

describe("ImagePreview actions", () => {
  it.each(["ondine", "mmdc"] as const)(
    "keeps original SVG actions after a %s browser preview failure",
    async (engineLabel) => {
      const imagePath = path.join(directory, "original.svg");
      fs.writeFileSync(imagePath, svg);
      setPreviewState("Unable to read image: browser failed");

      const screen = ImagePreview({ imagePath, format: "svg", engineLabel, svgRasterStrategy: "browser" });
      expect(screen.type).toBe(Detail);
      expect(screen.props.markdown).toContain("browser failed");
      const actions = collectActions(screen.props.actions);
      expect(actions.map((action) => action.title)).toEqual(["Save Image", "Open in Default App", "Copy SVG Code"]);

      for (const action of actions) await action.onAction?.();

      const savedFile = fs.readdirSync(directory).find((file) => file.startsWith("mermaid-diagram-"));
      expect(savedFile).toBeDefined();
      expect(fs.readFileSync(path.join(directory, savedFile!), "utf8")).toBe(svg);
      expect(open).toHaveBeenCalledWith(directory);
      expect(open).toHaveBeenCalledWith(imagePath);
      expect(Clipboard.copy).toHaveBeenCalledWith(svg);
      expect(renderSvgPreviewRasterWithStrategy).not.toHaveBeenCalled();
      expect(fs.readFileSync(imagePath, "utf8")).toBe(svg);
    },
  );

  it("preserves the normal SVG preview actions", () => {
    setPreviewState(null);
    const screen = ImagePreview({ imagePath: path.join(directory, "original.svg"), format: "svg" });
    const [item] = Children.toArray(screen.props.children);
    if (!isValidElement<{ actions: ReactNode }>(item)) throw new Error("Missing image preview item");
    expect(collectActions(item.props.actions).map((action) => action.title)).toEqual([
      "Copy Image",
      "Copy SVG Code",
      "Save Image",
      "Open in Default App",
    ]);
  });

  it("does not offer SVG-code copying for a PNG preview error", () => {
    setPreviewState("Unable to read image: preview failed");
    const screen = ImagePreview({ imagePath: path.join(directory, "original.png"), format: "png" });
    expect(collectActions(screen.props.actions).map((action) => action.title)).toEqual([
      "Save Image",
      "Open in Default App",
    ]);
  });
});
