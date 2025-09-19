import {
  Clipboard,
  LocalStorage,
  Toast,
  showHUD,
  showToast,
  getPreferenceValues,
} from "@raycast/api";
const { tmpdir } = require("node:os");
const { writeFile } = require("node:fs/promises");
const { join } = require("node:path");
const { generateImage, PRESET_PROMPTS } = require("./lib/gemini");
const { overlayLGTM, createFallbackImage } = require("./lib/overlay");

type SavedSettings = {
  mode: string;
  preset: string;
  customPrompt: string;
  text: string;
  fontSize: string;
  size: string;
  styleImage?: string[];
};

type Preferences = {
  geminiApiKey: string;
};

export default async function QuickLGTM() {
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Generating quick LGTM...",
  });

  try {
    const { geminiApiKey } = getPreferenceValues<Preferences>();

    if (!geminiApiKey) {
      throw new Error(
        "Gemini API key is not configured. Please set it in preferences.",
      );
    }

    const savedSettingsRaw = await LocalStorage.getItem<string>("lastSettings");

    let settings: SavedSettings;
    if (savedSettingsRaw) {
      settings = JSON.parse(savedSettingsRaw);
    } else {
      settings = {
        mode: "style",
        preset: "pixelHeartBoy",
        customPrompt: "",
        text: "LGTM",
        fontSize: "large",
        size: "1024",
      };
    }

    const buildPrompt = (): { prompt: string; isEdit: boolean } => {
      const baseUserPrompt = (settings.customPrompt || "").trim();
      const fallbackPreset =
        PRESET_PROMPTS[settings.preset as keyof typeof PRESET_PROMPTS] ||
        PRESET_PROMPTS.pixelHeartBoy;
      const core = baseUserPrompt !== "" ? baseUserPrompt : fallbackPreset;
      const hasInputImage =
        settings.styleImage && settings.styleImage.length > 0;
      const isEdit = settings.mode === "edit" || hasInputImage;
      const context = isEdit
        ? `Edit / transform the provided image according to the description while preserving essential recognizable structure unless changes are explicitly requested.`
        : `Create a new pixel art background (no text) suitable for overlaying 'LGTM' later.`;
      const guidance = `Requirements:\n- Keep central area relatively open (negative space)\n- No textual characters or logos\n- High readability / controlled palette\n- Pixel art aesthetic`;
      return {
        prompt: `${core}\n\n${context}\n\nThe final image will have 'LGTM' text overlaid afterward, so DO NOT include any text yourself.\n\n${guidance}`,
        isEdit: !!isEdit,
      };
    };
    const { prompt } = buildPrompt();

    const styleImagePath =
      settings.styleImage && settings.styleImage.length > 0
        ? settings.styleImage[0]
        : settings.mode === "style"
          ? join(__dirname, "..", "assets", "pixel-heart-style.png")
          : undefined;

    let basePng: Buffer;
    let usedFallback = false;
    try {
      if (settings.mode === "fallback") throw new Error("Force fallback");
      basePng = await generateImage({
        apiKey: geminiApiKey,
        prompt,
        styleImagePath,
        size: settings.size === "512" ? 512 : 1024,
        negativePrompt: "text, letters, logo, watermark",
        // isEdit はライブラリ側で推定 or prompt に含まれているキーワードで判断
      });
    } catch (e) {
      console.warn("Gemini quick generation failed, fallback", e);
      basePng = await createFallbackImage(" ");
      usedFallback = true;
    }

    const composedImage = await overlayLGTM({
      basePng,
      text: settings.text || "LGTM",
      fontSize: settings.fontSize as "small" | "medium" | "large",
    });

    const timestamp = Date.now();
    const outputPath = join(tmpdir(), `lgtm-quick-${timestamp}.png`);
    await writeFile(outputPath, composedImage);

    await Clipboard.copy({ file: outputPath });

    await showHUD(
      usedFallback
        ? "⚡ Quick Fallback LGTM copied"
        : "⚡ Quick LGTM copied to clipboard!",
    );

    toast.style = Toast.Style.Success;
    toast.title = "Quick LGTM generated!";
    toast.message = usedFallback
      ? "Fallback image + text overlay"
      : "Image copied to clipboard";
  } catch (error: any) {
    console.error("Quick generation error:", error);
    toast.style = Toast.Style.Failure;
    toast.title = "Failed to generate quick LGTM";
    toast.message = error.message || "An unexpected error occurred";
  }
}
