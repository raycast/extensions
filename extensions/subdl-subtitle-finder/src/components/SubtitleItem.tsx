import { ActionPanel, Action, List, Icon, showToast, Toast, getPreferenceValues } from "@raycast/api";
import { Subtitle } from "../api";
import { subdlAPI } from "../api";
import * as fs from "fs";
import * as path from "path";
import { homedir } from "os";

interface SubtitleItemProps {
  subtitle: Subtitle;
  onRefresh: () => void;
}

export function SubtitleItem({ subtitle, onRefresh }: SubtitleItemProps) {
  const getLanguageIcon = (lang?: string) => {
    if (!lang) return Icon.Text;

    const languageIcons: { [key: string]: Icon } = {
      arabic: Icon.Text,
      english: Icon.Text,
      french: Icon.Text,
      spanish: Icon.Text,
      german: Icon.Text,
      italian: Icon.Text,
      portuguese: Icon.Text,
      russian: Icon.Text,
      japanese: Icon.Text,
      korean: Icon.Text,
      chinese: Icon.Text,
    };
    return languageIcons[lang.toLowerCase()] || Icon.Text;
  };

  const getLanguageFlag = (lang?: string) => {
    if (!lang) return "🌐";

    const languageFlags: { [key: string]: string } = {
      arabic: "🇸🇦",
      english: "🇺🇸",
      french: "🇫🇷",
      spanish: "🇪🇸",
      german: "🇩🇪",
      italian: "🇮🇹",
      portuguese: "🇵🇹",
      russian: "🇷🇺",
      japanese: "🇯🇵",
      korean: "🇰🇷",
      chinese: "🇨🇳",
    };
    return languageFlags[lang.toLowerCase()] || "🌐";
  };

  const extractQuality = (releaseName: string): string => {
    const name = releaseName.toLowerCase();
    if (name.includes("2160p") || name.includes("4k")) return "4K/2160p";
    if (name.includes("1080p")) return "1080p";
    if (name.includes("720p")) return "720p";
    if (name.includes("480p")) return "480p";
    if (name.includes("360p")) return "360p";
    return "Unknown";
  };

  const handleDownload = async () => {
    try {
      await showToast({
        style: Toast.Style.Animated,
        title: "Getting download link...",
      });

      const detail = await subdlAPI.getSubtitleDetail(subtitle.url);

      await showToast({
        style: Toast.Style.Animated,
        title: "Downloading subtitle...",
      });

      const subtitleData = await subdlAPI.downloadSubtitle(detail.download_url);

      // Get download directory preference or use Downloads folder
      const preferences = getPreferenceValues<{ downloadDirectory?: string }>();
      const downloadDir = preferences.downloadDirectory || path.join(homedir(), "Downloads");

      // Ensure directory exists
      if (!fs.existsSync(downloadDir)) {
        fs.mkdirSync(downloadDir, { recursive: true });
      }

      const filename = detail.filename || `${subtitle.name}`;
      const filePath = path.join(downloadDir, filename);

      fs.writeFileSync(filePath, Buffer.from(subtitleData));

      await showToast({
        style: Toast.Style.Success,
        title: "Subtitle downloaded!",
        message: `Saved to ${filePath}`,
      });

      onRefresh();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Download failed",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  const handleCopyLink = async () => {
    try {
      await showToast({
        style: Toast.Style.Animated,
        title: "Getting download link...",
      });

      const detail = await subdlAPI.getSubtitleDetail(subtitle.url);

      await showToast({
        style: Toast.Style.Success,
        title: "Link copied to clipboard!",
      });

      return detail.download_url;
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to get link",
        message: error instanceof Error ? error.message : "Unknown error",
      });
      return "";
    }
  };

  const accessories = [];

  // Add language flag
  if (subtitle.lang) {
    accessories.push({
      text: getLanguageFlag(subtitle.lang),
      tooltip: subtitle.lang || "Unknown Language",
    });
  }

  // Add download count
  if (subtitle.SubDownloadsCnt) {
    accessories.push({
      icon: Icon.Download,
      text: subtitle.SubDownloadsCnt,
      tooltip: `${subtitle.SubDownloadsCnt} downloads`,
    });
  }

  // Add rating
  if (subtitle.SubRating) {
    accessories.push({
      icon: Icon.Star,
      text: `${subtitle.SubRating}/10`,
      tooltip: `Rating: ${subtitle.SubRating}/10`,
    });
  }

  // Add quality
  const quality = extractQuality(subtitle.release_name || "");
  if (quality !== "Unknown") {
    accessories.push({
      icon: Icon.Video,
      text: quality,
      tooltip: `Quality: ${quality}`,
    });
  }

  // Add file size
  if (subtitle.SubSize) {
    accessories.push({
      icon: Icon.Document,
      text: subtitle.SubSize,
      tooltip: `File size: ${subtitle.SubSize}`,
    });
  }

  return (
    <List.Item
      icon={getLanguageIcon(subtitle.lang)}
      title={subtitle.release_name || subtitle.name || "Unknown Title"}
      subtitle={`${subtitle.lang || "Unknown"} • ${subtitle.author || "Unknown"} • ${quality}`}
      accessories={accessories}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action title="Download Subtitle" icon={Icon.Download} onAction={handleDownload} />
            <Action title="Copy Download Link" icon={Icon.Link} onAction={handleCopyLink} />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action title="Refresh Results" icon={Icon.ArrowClockwise} onAction={onRefresh} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
