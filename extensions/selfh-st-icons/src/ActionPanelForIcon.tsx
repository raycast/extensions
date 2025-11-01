import {
  ActionPanel,
  Action,
  Icon,
  Clipboard,
  showToast,
  Toast,
} from "@raycast/api";
import { FC, useState, useEffect } from "react";
import { getIconCdnUrl, IconIndexEntry, downloadIconFile } from "./utils/icons";
import { KEYBOARD_SHORTCUTS, getPreferences } from "./utils/preferences";
import { showFailureToast } from "@raycast/utils";

/**
 * Props for the ActionPanelForIcon component
 */
interface Props {
  /** The icon entry to display actions for */
  icon: IconIndexEntry;
  /** Current display variant (default/light/dark) */
  currentVariant: "default" | "light" | "dark";
  /** Callback for when the variant changes */
  onVariantChange: (
    variant:
      | "default"
      | "light"
      | "dark"
      | ((
          current: "default" | "light" | "dark",
        ) => "default" | "light" | "dark"),
  ) => void;
}

/**
 * Available icon formats with their corresponding properties in IconIndexEntry
 */
const formats: Array<{
  key: keyof IconIndexEntry;
  label: string;
  format: "png" | "webp" | "svg";
}> = [
  { key: "PNG", label: "PNG", format: "png" },
  { key: "WebP", label: "WebP", format: "webp" },
  { key: "SVG", label: "SVG", format: "svg" },
];

/**
 * Available icon variants with their corresponding flags in IconIndexEntry
 */
const variants: Array<{
  key: "default" | "light" | "dark";
  label: string;
  flag?: keyof IconIndexEntry;
}> = [
  { key: "default", label: "Default" },
  { key: "light", label: "Light", flag: "Light" },
  { key: "dark", label: "Dark", flag: "Dark" },
];

/**
 * Gets the first available format for an icon.
 * Checks formats in order of PNG, WebP, SVG.
 *
 * @param icon - The icon entry to check formats for
 * @returns The first available format and its label, or null if no formats are available
 */
function getFirstAvailableFormat(icon: IconIndexEntry) {
  for (const { key, format, label } of formats) {
    if (icon[key] === "Yes") {
      return { format, label };
    }
  }
  return null;
}

/**
 * Component that renders the action panel for an icon.
 * Provides actions for downloading icons, copying URLs, and switching formats/variants.
 *
 * @param props - Component props
 * @param props.icon - The icon entry to display actions for
 * @param props.currentVariant - Current display variant (default/light/dark)
 * @param props.onVariantChange - Callback for when the variant changes
 */
export const ActionPanelForIcon: FC<Props> = ({
  icon,
  currentVariant,
  onVariantChange,
}) => {
  const [format, setFormat] = useState<"png" | "webp" | "svg">("png");
  const [downloadLocation, setDownloadLocation] =
    useState<string>("~/Downloads");

  // Load user preferences for download location
  useEffect(() => {
    const loadPreferences = async () => {
      try {
        const prefs = await getPreferences();
        setDownloadLocation(prefs.downloadLocation);
      } catch (error) {
        showFailureToast(error, { title: "Failed to load preferences" });
      }
    };
    loadPreferences();
  }, []);

  // Get default format and URL for the icon
  const firstFormat = getFirstAvailableFormat(icon);
  const defaultUrl = firstFormat
    ? getIconCdnUrl(icon.Reference, firstFormat.format, "default")
    : undefined;
  const defaultFilename = firstFormat
    ? `${icon.Reference}.${firstFormat.format}`
    : undefined;

  // Determine if variant is available and set download parameters
  const hasVariant =
    currentVariant !== "default" &&
    icon[currentVariant === "light" ? "Light" : "Dark"] === "Yes";
  const downloadVariant = hasVariant ? currentVariant : "default";
  const downloadUrl = getIconCdnUrl(icon.Reference, format, downloadVariant);
  const downloadFilename = `${icon.Reference}${downloadVariant === "default" ? "" : `-${downloadVariant}`}.${format}`;

  /**
   * Handles downloading the current icon in the selected format and variant.
   * Shows success/failure toast messages.
   */
  const handleDownload = async () => {
    try {
      await downloadIconFile(downloadUrl, downloadFilename, downloadLocation);
      showToast({
        style: Toast.Style.Success,
        title: "Downloaded",
        message: downloadFilename,
      });
    } catch (error) {
      showFailureToast(error, { title: "Download Failed" });
    }
  };

  /**
   * Handles copying the current icon's URL to clipboard.
   * Shows success toast with the copied URL.
   */
  const handleCopyUrl = async () => {
    await Clipboard.copy(downloadUrl);
    showToast({
      style: Toast.Style.Success,
      title: "URL Copied",
      message: downloadUrl,
    });
  };

  /**
   * Cycles through available formats: PNG -> WebP -> SVG -> PNG
   */
  const toggleFormat = () => {
    setFormat((current) => {
      switch (current) {
        case "png":
          return "webp";
        case "webp":
          return "svg";
        case "svg":
          return "png";
      }
    });
  };

  /**
   * Cycles through available variants: default -> light -> dark -> default
   */
  const toggleVariant = () => {
    onVariantChange((current: "default" | "light" | "dark") => {
      switch (current) {
        case "default":
          return "light";
        case "light":
          return "dark";
        case "dark":
          return "default";
      }
    });
  };

  const variantTitle =
    currentVariant === "default"
      ? "Default"
      : currentVariant.charAt(0).toUpperCase() + currentVariant.slice(1);

  return (
    <ActionPanel>
      <Action
        icon={Icon.Download}
        title={`Download ${variantTitle} ${format.toUpperCase()}`}
        onAction={handleDownload}
        shortcut={undefined} // Default action, no shortcut
      />
      <Action
        icon={Icon.Link}
        title={`Copy ${variantTitle} ${format.toUpperCase()} URL`}
        onAction={handleCopyUrl}
        shortcut={KEYBOARD_SHORTCUTS.COPY_URL}
      />
      <ActionPanel.Section>
        <Action
          icon={Icon.Switch}
          title={`Toggle Variant (${variantTitle})`}
          onAction={toggleVariant}
          shortcut={KEYBOARD_SHORTCUTS.TOGGLE_VARIANT}
        />
        <Action
          icon={Icon.Document}
          title={`Toggle Format (${format.toUpperCase()})`}
          onAction={toggleFormat}
          shortcut={KEYBOARD_SHORTCUTS.TOGGLE_FORMAT}
        />
      </ActionPanel.Section>

      {firstFormat && (
        <Action
          title={`Download ${firstFormat.label}`}
          onAction={async () => {
            if (!defaultUrl || !defaultFilename) {
              await showFailureToast({
                title: "Download Failed",
                message: "Icon URL or filename not available",
              });
              return;
            }
            try {
              await downloadIconFile(
                defaultUrl,
                defaultFilename,
                downloadLocation,
              );
              showToast({
                style: Toast.Style.Success,
                title: "Downloaded",
                message: defaultFilename,
              });
            } catch (e: unknown) {
              showToast({
                style: Toast.Style.Failure,
                title: "Download Failed",
                message: e instanceof Error ? e.message : "Unknown error",
              });
            }
          }}
        />
      )}
      {formats.map(({ key, label, format }) => {
        if (icon[key] !== "Yes") return null;
        return (
          <ActionPanel.Section title={label} key={label}>
            {variants.map(({ key: variantKey, label: variantLabel, flag }) => {
              if (variantKey !== "default" && icon[flag!] !== "Yes")
                return null;
              const url = getIconCdnUrl(icon.Reference, format, variantKey);
              const filename = `${icon.Reference}${variantKey === "default" ? "" : `-${variantKey}`}.${format}`;
              return [
                <Action.CopyToClipboard
                  key={`copy-${variantKey}`}
                  title={`Copy ${variantLabel} ${label} URL`}
                  content={url}
                  icon={Icon.Clipboard}
                />,
                <Action
                  key={`download-${variantKey}`}
                  title={`Download ${variantLabel} ${label}`}
                  onAction={async () => {
                    try {
                      await downloadIconFile(url, filename, downloadLocation);
                      showToast({
                        style: Toast.Style.Success,
                        title: "Downloaded",
                        message: filename,
                      });
                    } catch (e: unknown) {
                      showToast({
                        style: Toast.Style.Failure,
                        title: "Download Failed",
                        message:
                          e instanceof Error ? e.message : "Unknown error",
                      });
                    }
                  }}
                  icon={Icon.Download}
                />,
              ];
            })}
          </ActionPanel.Section>
        );
      })}
    </ActionPanel>
  );
};
