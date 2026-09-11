import { showToast, Toast, getPreferenceValues, LaunchProps } from "@raycast/api";
import { writeFileSync } from "fs";
import { join } from "path";
import { homedir } from "os";

interface ApiResponse {
  data?: {
    content?: string;
  };
  error?: string;
}

export default async function Command(props: LaunchProps<{ arguments: Arguments.CreateWebsiteScreenshot }>) {
  let { websiteUrl } = props.arguments;

  if (!websiteUrl || websiteUrl.trim() === "") {
    await showToast({
      style: Toast.Style.Failure,
      title: "Website URL Required",
      message: "Please provide a valid website URL",
    });
    return;
  }

  // Add https:// if URL doesn't start with http or https
  websiteUrl = websiteUrl.trim();
  if (!websiteUrl.startsWith("http://") && !websiteUrl.startsWith("https://")) {
    websiteUrl = "https://" + websiteUrl;
  }

  await showToast({
    style: Toast.Style.Animated,
    title: "Generating Website Screenshot",
    message: "Please wait...",
  });

  try {
    const preferences = getPreferenceValues<Preferences>();

    const response = await fetch("https://orshot.com/api/templates/make-playground-request", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        templateSlug: "website-screenshot",
        modifications: {
          websiteUrl: websiteUrl,
        },
        userAPIKey: preferences.apiKey,
        responseType: "base64",
        responseFormat: "png",
        renderType: "images",
        source: "raycast-extension",
      }),
    });

    const data = (await response.json()) as ApiResponse;

    if (!response.ok) {
      throw new Error(data.error || "Failed to generate screenshot");
    }

    if (!data.data?.content) {
      throw new Error("No image data received");
    }

    // Extract base64 data from data URL format
    const base64Data = data.data.content.split(",")[1];
    if (!base64Data) {
      throw new Error("Invalid image data format");
    }

    // Convert base64 to buffer and save to specified directory
    const imageBuffer = Buffer.from(base64Data, "base64");
    const saveDirectory = preferences.saveDirectory || join(homedir(), "Desktop");
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = `website-screenshot-${timestamp}.png`;
    const filepath = join(saveDirectory, filename);

    writeFileSync(filepath, imageBuffer);

    await showToast({
      style: Toast.Style.Success,
      title: "Screenshot Generated",
      message: `Saved to ${filename}`,
    });
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to Generate Screenshot",
      message: error instanceof Error ? error.message : "Unknown error occurred",
    });
  }
}
