import { Detail, ActionPanel, Action, showToast, Toast, Icon, Color, trash, environment } from "@raycast/api";
import { useState, useEffect, useCallback } from "react";
import {
  generatePreview,
  generateFinalIcon,
  DEFAULT_ICON_PADDING,
  BackgroundConfig,
  getBackgroundDescription,
  getTargetTypeLabel,
} from "../utils/image-processor";
import { TargetType } from "../utils/app-utils";

export interface ApplyIconResult {
  processedIconPath: string;
  appPath: string;
  restartApp: boolean;
}

interface IconPreviewProps {
  iconPath: string;
  appPath: string;
  backgroundConfig: BackgroundConfig;
  restartApp: boolean;
  targetType?: TargetType;
  useFolderIcon?: boolean;
  preserveImageDetails?: boolean;
  folderIconPath?: string;
  onApply: (result: ApplyIconResult) => void;
  onBack: () => void;
}

export function IconPreview({
  iconPath,
  appPath,
  backgroundConfig,
  restartApp,
  targetType = "app",
  useFolderIcon = false,
  preserveImageDetails = true,
  folderIconPath,
  onApply,
  onBack,
}: IconPreviewProps) {
  const [padding, setPadding] = useState(DEFAULT_ICON_PADDING);
  const [previewPath, setPreviewPath] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const generatePreviewImage = useCallback(async () => {
    setIsGenerating(true);
    setError(null);

    try {
      // Clean up previous preview
      if (previewPath) {
        try {
          await trash(previewPath);
        } catch {
          if (environment.isDevelopment) {
            console.warn("Cleanup failed: ", error);
          }
        }
      }

      const path = await generatePreview({
        iconPath,
        backgroundConfig,
        padding,
        targetType,
        useFolderIcon,
        preserveImageDetails,
        folderIconPath,
      });

      setPreviewPath(path);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate preview");
      showToast({
        style: Toast.Style.Failure,
        title: "Preview Error",
        message: err instanceof Error ? err.message : "Unknown error",
      });
    } finally {
      setIsGenerating(false);
    }
  }, [iconPath, backgroundConfig, padding, targetType, useFolderIcon, preserveImageDetails, folderIconPath]);

  useEffect(() => {
    generatePreviewImage();
  }, [generatePreviewImage]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (previewPath) {
        trash(previewPath).catch(() => {
          if (environment.isDevelopment) {
            console.warn("Cleanup failed: ", error);
          }
        });
      }
    };
  }, []);

  const handleApply = async () => {
    setIsGenerating(true);

    try {
      await showToast({
        style: Toast.Style.Animated,
        title: "Generating final icon...",
      });

      const finalIconPath = await generateFinalIcon({
        iconPath,
        backgroundConfig,
        padding,
        targetType,
        useFolderIcon,
        preserveImageDetails,
        folderIconPath,
      });

      // Pass all needed values back to avoid stale closure issues
      onApply({
        processedIconPath: finalIconPath,
        appPath,
        restartApp,
      });
    } catch (err) {
      showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message: err instanceof Error ? err.message : "Failed to generate icon",
      });
      setIsGenerating(false);
    }
  };

  const changePadding = (delta: number) => {
    const newPadding = Math.max(0, Math.min(30, padding + delta));
    setPadding(newPadding);
  };

  // Get background type label
  const getBackgroundTypeLabel = () => {
    switch (backgroundConfig.type) {
      case "solid":
        return "Solid Color";
      case "gradient":
        return "Gradient";
      case "image":
        return "Image";
      default:
        return "Unknown";
    }
  };

  // Get the tint color for the background indicator
  const getBackgroundTintColor = (): string | undefined => {
    switch (backgroundConfig.type) {
      case "solid":
        return backgroundConfig.color;
      case "gradient":
        return backgroundConfig.colors[0];
      case "image":
        return undefined;
    }
  };

  const markdown = error
    ? `# Error\n\n${error}`
    : previewPath
      ? `<img src="${previewPath}?${Date.now()}" width="280" />`
      : "Generating preview...";

  return (
    <Detail
      navigationTitle="Icon Preview"
      isLoading={isGenerating}
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label
            title="Output Size"
            text={{ value: "1024×1024px" }}
            icon={{ source: Icon.Image, tintColor: Color.SecondaryText }}
          />
          <Detail.Metadata.Label
            title={`Target ${getTargetTypeLabel(targetType)}`}
            text={{ value: appPath.split("/")?.pop()?.replace(".app", "") || appPath }}
          />
          {useFolderIcon && (
            <Detail.Metadata.Label
              title="Style"
              text={{ value: "macOS Folder" }}
              icon={{ source: Icon.Folder, tintColor: Color.Blue }}
            />
          )}

          <Detail.Metadata.Separator />

          <Detail.Metadata.Label
            title={`${getBackgroundTypeLabel()} background`}
            text={{
              value: getBackgroundDescription(backgroundConfig),
              color: getBackgroundTintColor() ? Color.PrimaryText : Color.Blue,
            }}
            icon={
              getBackgroundTintColor()
                ? { source: Icon.CircleFilled, tintColor: getBackgroundTintColor() }
                : { source: Icon.Image, tintColor: Color.SecondaryText }
            }
          />
          <Detail.Metadata.TagList title="Padding (adjust using Actions)">
            <Detail.Metadata.TagList.Item text={`${padding}%`} />
          </Detail.Metadata.TagList>

          {targetType === "app" && (
            <>
              <Detail.Metadata.Separator />
              <Detail.Metadata.Label
                title=""
                text={{
                  value: restartApp ? "App will restart" : "App won't restart",
                  color: Color.SecondaryText,
                }}
                icon={{
                  source: restartApp ? Icon.CheckCircle : Icon.XMarkCircle,
                  tintColor: restartApp ? Color.Green : Color.SecondaryText,
                }}
              />
            </>
          )}
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Apply">
            <Action title="Apply Icon" icon={Icon.Checkmark} onAction={handleApply} />
            <Action
              title="Back to Form"
              icon={Icon.ArrowLeft}
              onAction={onBack}
              shortcut={{ modifiers: ["cmd"], key: "b" }}
            />
          </ActionPanel.Section>

          <ActionPanel.Section title="Adjust Padding">
            <Action
              title="Increase Padding (+5%)"
              icon={Icon.Plus}
              onAction={() => changePadding(5)}
              shortcut={{ modifiers: ["shift"], key: "arrowUp" }}
            />
            <Action
              title="Decrease Padding (-5%)"
              icon={Icon.Minus}
              onAction={() => changePadding(-5)}
              shortcut={{ modifiers: ["shift"], key: "arrowDown" }}
            />
            <Action
              title="Fine Increase (+1%)"
              icon={Icon.Plus}
              onAction={() => changePadding(1)}
              shortcut={{ modifiers: ["opt", "shift"], key: "arrowUp" }}
            />
            <Action
              title="Fine Decrease (-1%)"
              icon={Icon.Minus}
              onAction={() => changePadding(-1)}
              shortcut={{ modifiers: ["opt", "shift"], key: "arrowDown" }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
