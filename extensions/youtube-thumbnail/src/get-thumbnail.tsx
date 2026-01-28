import { Detail, showToast, Toast, ActionPanel, Action, Clipboard, Icon, getPreferenceValues } from "@raycast/api";
import axios from "axios";
import { useEffect, useState } from "react";
import fs from "fs";
import path from "path";
import os from "os";

interface CommandArguments {
  url: string;
}

interface Preferences {
  downloadLocation: string;
}

export default function Command(props: { arguments: CommandArguments }) {
  const { url } = props.arguments;
  const videoId = extractVideoId(url);

  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const preferences = getPreferenceValues<Preferences>();

  useEffect(() => {
    if (videoId) {
      checkImageExistence(videoId);
    } else {
      showToast(Toast.Style.Failure, "Invalid YouTube URL", "Please enter a valid URL");
    }
  }, [videoId]);

  async function checkImageExistence(videoId: string) {
    const maxresUrl = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
    const hqUrl = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;

    try {
      await axios.head(maxresUrl);
      setImageUrl(maxresUrl);
    } catch {
      setImageUrl(hqUrl);
    }
  }

  async function downloadImage() {
    if (!imageUrl) return;

    const response = await axios.get(imageUrl, { responseType: "arraybuffer" });
    const buffer = Buffer.from(response.data, "binary");
    const timestamp = Date.now();
    const downloadPath = preferences.downloadLocation.replace("~", os.homedir());
    const fileName = path.join(
      downloadPath,
      `${path.basename(imageUrl, path.extname(imageUrl))}-${timestamp}${path.extname(imageUrl)}`,
    );

    fs.writeFileSync(fileName, buffer);
    showToast(Toast.Style.Success, "Thumbnail Downloaded", `Saved to ${downloadPath}`);
  }

  async function copyImageUrl() {
    if (!imageUrl) return;

    await Clipboard.copy(imageUrl);
    showToast(Toast.Style.Success, "Thumbnail URL Copied", imageUrl);
  }

  if (!videoId) {
    return (
      <Detail
        markdown="## Invalid YouTube URL  
Please enter a valid URL"
      />
    );
  }

  if (!imageUrl) {
    return null;
  }

  return (
    <Detail
      markdown={`![YouTube Thumbnail](${imageUrl})`}
      actions={
        <ActionPanel>
          <Action title="Download Image" onAction={downloadImage} icon={Icon.Download} />
          <Action title="Copy Image URL" onAction={copyImageUrl} icon={Icon.Clipboard} />
        </ActionPanel>
      }
    />
  );
}

function extractVideoId(url: string): string | null {
  const regex = new RegExp(
    "(?:https?://)?(?:www\\.)?(?:youtube\\.com/(?:[^/\\n\\s]+/\\S+/|(?:v|e(?:mbed)?)/|shorts/|\\S*?[?&]v=)|youtu\\.be/)([a-zA-Z0-9_-]{11})",
  );
  const match = url.match(regex);
  return match ? match[1] : null;
}
