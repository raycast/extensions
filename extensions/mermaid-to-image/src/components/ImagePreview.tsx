import React, { useEffect, useRef, useState } from "react";
import path from "path";
import { Detail, List, Icon, Clipboard, ActionPanel, Action, open, getPreferenceValues } from "@raycast/api";
import { Preferences } from "../types";
import { ResolvedEngine, SvgRasterStrategy } from "../renderers/types";
import { cleanupTempFile } from "../utils/files";
import { buildImagePreviewItems, type ImagePreviewItemModel } from "../utils/image-preview-model";
import { supportsBeautifulMermaidSyntax } from "../renderers/select-renderer";
import { renderBeautifulMermaidAscii } from "../renderers/beautiful-mermaid-ascii";
import {
  formatBeautifulMermaidSourceLabel,
  resolveBeautifulMermaidRuntime,
} from "../renderers/beautiful-mermaid-runtime";
import { renderSvgPreviewRasterWithStrategy } from "../utils/svg-preview-raster";
import { copyRasterImageToClipboard } from "../utils/macos-image-tools";
import {
  copyAsciiCode,
  copyDiagramImage,
  copySvgCode,
  openDiagramFile,
  saveDiagramFile,
} from "../utils/preview-actions";
import { loadPreviewAsset, resolveSvgCopyAsset } from "../utils/preview-assets";
import { showActionFailureToast, showSuccessToast } from "../utils/notifications";
import { logOperationalError } from "../utils/logger";

interface ImagePreviewProps {
  imagePath: string;
  format: string;
  engineLabel?: ResolvedEngine | null;
  svgRasterStrategy?: SvgRasterStrategy | null;
  mermaidCode?: string | null;
}

export function ImagePreview({ imagePath, format, engineLabel, svgRasterStrategy, mermaidCode }: ImagePreviewProps) {
  const preferences = getPreferenceValues<Preferences>();

  const [imageContent, setImageContent] = useState<string>("");
  const [imageError, setImageError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [asciiContent, setAsciiContent] = useState<string | null>(null);
  const [beautifulMermaidSourceLabel, setBeautifulMermaidSourceLabel] = useState<string | null>(null);
  const previewTempPathsRef = useRef<string[]>([]);
  const previewRasterPathRef = useRef<string | null>(null);
  const supportsAsciiPreview = Boolean(mermaidCode && supportsBeautifulMermaidSyntax(mermaidCode));
  const asciiFailureShownRef = useRef(false);

  const renderSvgPreview = async (materializedSvgContent: string, baseName: string) => {
    return renderSvgPreviewRasterWithStrategy({
      strategy: svgRasterStrategy ?? "macos",
      materializedSvgContent,
      baseName,
    });
  };

  const cleanupPreviewTemp = () => {
    for (const tempPath of previewTempPathsRef.current) {
      cleanupTempFile(tempPath);
    }
    previewTempPathsRef.current = [];
    previewRasterPathRef.current = null;
  };

  useEffect(() => {
    setAsciiContent(null);
    asciiFailureShownRef.current = false;
  }, [imagePath]);

  useEffect(() => {
    let cancelled = false;

    const prepareAsciiPreview = async () => {
      if (!supportsAsciiPreview || !mermaidCode) {
        setBeautifulMermaidSourceLabel(null);
        setAsciiContent(null);
        return;
      }

      try {
        const runtime = await resolveBeautifulMermaidRuntime({
          customPath: preferences.customBeautifulMermaidPath,
          notifyBundledFallback: true,
        });

        if (cancelled) {
          return;
        }

        setBeautifulMermaidSourceLabel(formatBeautifulMermaidSourceLabel(runtime));
        setAsciiContent(renderBeautifulMermaidAscii(mermaidCode, runtime.module));
      } catch (error) {
        logOperationalError("prepare-ascii-preview-failed", error, { renderer: "beautiful" });

        if (cancelled) {
          return;
        }

        setAsciiContent(null);
        if (!asciiFailureShownRef.current) {
          asciiFailureShownRef.current = true;
          await showActionFailureToast(error, "ASCII preview unavailable");
        }
      }
    };

    prepareAsciiPreview();

    return () => {
      cancelled = true;
    };
  }, [mermaidCode, preferences.customBeautifulMermaidPath, supportsAsciiPreview]);

  useEffect(() => {
    const loadImage = async () => {
      try {
        setIsLoading(true);
        cleanupPreviewTemp();

        const asset = await loadPreviewAsset({
          format,
          imagePath,
          baseName: `mermaid-svg-preview-${Date.now()}`,
          renderSvgPreview: ({ materializedSvgContent, baseName }) =>
            renderSvgPreview(materializedSvgContent, baseName),
        });
        previewTempPathsRef.current = asset.tempPaths;
        previewRasterPathRef.current = asset.previewRasterPath;
        setImageContent(asset.imageContent);
        setIsLoading(false);
      } catch (error) {
        logOperationalError("load-preview-asset-failed", error, { format });
        const errorMessage = error instanceof Error ? error.message : String(error);
        setImageError(`Unable to read image: ${errorMessage}`);
        setIsLoading(false);
        await showActionFailureToast(error, "Failed to load image", errorMessage);
      }
    };

    loadImage();

    return () => {
      cleanupPreviewTemp();
    };
  }, [imagePath, format]);

  if (isLoading) {
    return <Detail markdown="# Loading image..." isLoading={true} />;
  }

  if (imageError) {
    return <Detail markdown={`# Image loading failed\n\n${imageError}`} />;
  }

  const items = buildImagePreviewItems({
    imagePath,
    imageContent,
    engineLabel,
    asciiContent,
    beautifulMermaidSourceLabel,
  });

  function renderCommonFileActions() {
    return (
      <>
        <Action
          title="Save Image"
          icon={Icon.SaveDocument}
          shortcut={{ modifiers: ["cmd"], key: "s" }}
          onAction={async () => {
            try {
              const savedPath = saveDiagramFile({
                imagePath,
                format,
                customSavePath: preferences.savePath,
              });
              await showSuccessToast("Image saved", `Saved to ${savedPath}`);
              await open(path.dirname(savedPath));
            } catch (error) {
              await showActionFailureToast(error, "Save failed");
            }
          }}
        />
        <Action
          title="Open in Default App"
          icon={Icon.Eye}
          shortcut={{ modifiers: ["cmd"], key: "o" }}
          onAction={async () => {
            try {
              await openDiagramFile(imagePath, open);
            } catch (error) {
              await showActionFailureToast(error, "Failed to open image");
            }
          }}
        />
      </>
    );
  }

  function renderActions(item: ImagePreviewItemModel) {
    if (item.id === "ascii-preview") {
      return (
        <ActionPanel>
          <Action
            title="Copy ASCII Code"
            icon={Icon.Clipboard}
            shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
            onAction={async () => {
              try {
                await copyAsciiCode({
                  asciiContent: item.copyValue ?? "",
                  copyText: Clipboard.copy,
                });
                await showSuccessToast("ASCII code copied");
              } catch (error) {
                await showActionFailureToast(error, "Copy failed");
              }
            }}
          />
          {renderCommonFileActions()}
        </ActionPanel>
      );
    }

    return (
      <ActionPanel>
        <Action
          title="Copy Image"
          icon={Icon.Clipboard}
          shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
          onAction={async () => {
            try {
              await copyDiagramImage({
                format,
                imagePath,
                previewRasterPath: previewRasterPathRef.current,
                copyRasterImage: copyRasterImageToClipboard,
                resolveSvgCopy: ({ svgPath, previewRasterPath }) =>
                  resolveSvgCopyAsset({
                    svgPath,
                    previewRasterPath,
                    baseName: `mermaid-svg-copy-${Date.now()}`,
                    renderSvgPreview: ({ materializedSvgContent, baseName }) =>
                      renderSvgPreview(materializedSvgContent, baseName),
                  }),
                cleanupTempPath: cleanupTempFile,
              });
              await showSuccessToast("Image copied");
            } catch (error) {
              logOperationalError("copy-diagram-image-failed", error, { format });
              await showActionFailureToast(error, "Copy failed");
            }
          }}
        />
        <Action.ToggleQuickLook shortcut={{ modifiers: ["cmd"], key: "y" }} />
        {format === "svg" && (
          <Action
            title="Copy SVG Code"
            icon={Icon.Code}
            shortcut={{ modifiers: ["cmd", "opt"], key: "c" }}
            onAction={async () => {
              try {
                await copySvgCode({
                  imagePath,
                  copyText: Clipboard.copy,
                });
                await showSuccessToast("SVG code copied");
              } catch (error) {
                await showActionFailureToast(error, "Copy failed");
              }
            }}
          />
        )}
        {renderCommonFileActions()}
      </ActionPanel>
    );
  }

  return (
    <List isShowingDetail={true} filtering={false}>
      {items.map((item) => (
        <List.Item
          key={item.id}
          id={item.id}
          title={item.title}
          subtitle={item.subtitle}
          icon={item.id === "image-preview" ? Icon.Image : Icon.Terminal}
          detail={<List.Item.Detail markdown={item.markdown} />}
          quickLook={item.quickLook}
          actions={renderActions(item)}
        />
      ))}
    </List>
  );
}
