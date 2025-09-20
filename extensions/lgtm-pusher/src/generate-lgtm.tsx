import {
  Action,
  ActionPanel,
  Clipboard,
  Form,
  LocalStorage,
  Toast,
  showHUD,
  showToast,
  getPreferenceValues,
  open,
} from "@raycast/api";
import { useState } from "react";
const { tmpdir } = require("node:os");
const { writeFile } = require("node:fs/promises");
const { join } = require("node:path");
const { generateImage, PRESET_PROMPTS } = require("./lib/gemini");
const { overlayLGTM, createFallbackImage } = require("./lib/overlay");

type FormValues = {
  mode: string;
  preset: string;
  customPrompt: string;
  text: string;
  fontSize: string;
  size: string;
  styleImage: string[];
  // Template mode fields
  promptMode: string;
  logoType: string;
  fontStyle: string;
  mainElement: string;
  colorScheme: string;
};

type Preferences = {
  geminiApiKey: string;
};

export default function GenerateLGTM() {
  const [isLoading, setIsLoading] = useState(false);
  const [generatedImagePath, setGeneratedImagePath] = useState<string | null>(
    null,
  );
  const [promptMode, setPromptMode] = useState<string>("simple");

  async function handleSubmit(values: FormValues) {
    setIsLoading(true);
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Generating LGTM image...",
    });

    try {
      const { geminiApiKey } = getPreferenceValues<Preferences>();

      if (!geminiApiKey) {
        throw new Error(
          "Gemini API key is not configured. Please set it in preferences.",
        );
      }

      // プロンプト構築関数: custom + (fallback preset) + LGTM 文脈 + 画像あり時は編集指示強化
      const buildPrompt = (): { prompt: string; isEdit: boolean } => {
        const hasInputImage = values.styleImage && values.styleImage.length > 0;
        const isEdit = values.mode === "edit" || hasInputImage;

        // Templateモードの場合
        if (values.promptMode === "template") {
          const logoType = values.logoType || "LGTMのロゴ";
          const fontStyle = values.fontStyle || "幾何学的で太字のサンセリフ体";
          const mainElement = values.mainElement || "からあげ";
          const colorScheme = values.colorScheme || "画像をもとに";
          const text = values.text || "LGTM";

          // テンプレートプロンプト：LGTMテキストを含む画像生成
          const templatePrompt = `${mainElement}をメインテーマとした${logoType}を作成してください。
${hasInputImage ? "送付した画像をスタイル参照として、" : ""}
画像の中央に「${text}」のテキストを${fontStyle}で大きく配置してください。
配色は${colorScheme}で設定。

必須要件：
- 8-bit pixel art aesthetic
- 「${text}」のテキストを画像の中央に必ず描画すること
- テキストは${fontStyle}（太字・幾何学的）で大きく目立つように配置
- テキストと背景のコントラストを高くして読みやすくする
- ${mainElement}の要素を背景やアクセントとして配置`;

          return {
            prompt: templatePrompt,
            isEdit,
          };
        }

        // Simpleモード（既存のロジック）
        const baseUserPrompt = (values.customPrompt || "").trim();
        const fallbackPreset =
          PRESET_PROMPTS[values.preset as keyof typeof PRESET_PROMPTS] ||
          PRESET_PROMPTS.pixelHeartBoy;
        const core = baseUserPrompt !== "" ? baseUserPrompt : fallbackPreset;
        const textToRender = values.text || "LGTM";
        const context = isEdit
          ? `Edit / transform the provided image and add "${textToRender}" text prominently in the center.`
          : `Create a new pixel art image with "${textToRender}" text prominently displayed in the center.`;
        const guidance = `Requirements:\n- Display "${textToRender}" text in large, bold letters at the center\n- Use high contrast between text and background\n- 8-bit pixel art aesthetic\n- Make the text the focal point of the image`;
        return {
          prompt: `${core}\n\n${context}\n\n${guidance}`,
          isEdit,
        };
      };
      const { prompt, isEdit } = buildPrompt();

      // 新仕様: styleImage があれば常に参照。無ければ従来の style モード時だけデフォルト参照
      const styleImagePath =
        values.styleImage && values.styleImage.length > 0
          ? values.styleImage[0]
          : values.mode === "style"
            ? join(__dirname, "..", "assets", "pixel-heart-style.png")
            : undefined;

      let baseImage: Buffer;
      let usedFallback = false;
      try {
        if (values.mode === "fallback") {
          throw new Error("Force fallback mode");
        }
        baseImage = await generateImage({
          apiKey: geminiApiKey,
          prompt,
          styleImagePath,
          size: values.size === "512" ? 512 : 1024,
          negativePrompt: "watermark, logo, UI elements",
          isEdit,
        });
      } catch (e) {
        console.warn("Gemini generation failed, using fallback", e);
        baseImage = await createFallbackImage(" "); // 後で文字をオーバーレイ
        usedFallback = true;
      }

      // 注：Geminiがテキストを生成した場合、overlayLGTMで二重になる可能性があります
      // 必要に応じて、このオーバーレイ処理をスキップすることも可能です
      const composed = await overlayLGTM({
        basePng: baseImage,
        text: values.text || "LGTM",
        fontSize: values.fontSize as any,
      });

      const timestamp = Date.now();
      const outputPath = join(tmpdir(), `lgtm-${timestamp}.png`);
      await writeFile(outputPath, composed);

      setGeneratedImagePath(outputPath);

      await Clipboard.copy({ file: outputPath });
      await showHUD(
        usedFallback
          ? "✨ Fallback LGTM copied"
          : "✨ LGTM image copied to clipboard!",
      );

      await LocalStorage.setItem("lastSettings", JSON.stringify(values));

      toast.style = Toast.Style.Success;
      toast.title = "Image generated successfully!";
      toast.message = "Copied to clipboard";
    } catch (error: any) {
      console.error("Generation error:", error);
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to generate image";
      toast.message = error.message || "An unexpected error occurred";
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Generate & Copy" onSubmit={handleSubmit} />
          {generatedImagePath && (
            <>
              <Action
                title="Open Image"
                onAction={() => open(generatedImagePath)}
              />
              <Action
                title="Copy to Clipboard Again"
                onAction={async () => {
                  await Clipboard.copy({ file: generatedImagePath });
                  await showHUD("✨ Copied to clipboard!");
                }}
              />
            </>
          )}
        </ActionPanel>
      }
    >
      <Form.Dropdown
        id="promptMode"
        title="Prompt Mode"
        defaultValue="simple"
        onChange={setPromptMode}
      >
        <Form.Dropdown.Item value="simple" title="Simple (Preset/Custom)" />
        <Form.Dropdown.Item value="template" title="Template (Structured)" />
      </Form.Dropdown>

      <Form.Dropdown id="mode" title="Mode" defaultValue="style">
        <Form.Dropdown.Item value="prompt" title="Prompt Only" />
        <Form.Dropdown.Item
          value="style"
          title="Style Reference (8-bit Heart)"
        />
        <Form.Dropdown.Item value="edit" title="Edit (Custom Image + Prompt)" />
        <Form.Dropdown.Item value="fallback" title="Fallback (No API)" />
      </Form.Dropdown>

      {promptMode === "simple" ? (
        <>
          <Form.Dropdown
            id="preset"
            title="Preset Style"
            defaultValue="pixelHeartBoy"
          >
            <Form.Dropdown.Item
              value="pixelHeartBoy"
              title="Pixel Heart Boy (Default)"
            />
            <Form.Dropdown.Item value="pixelGalaxy" title="Pixel Galaxy" />
            <Form.Dropdown.Item value="pixelOffice" title="Pixel Office" />
            <Form.Dropdown.Item value="pixelCat" title="Pixel Cat Programmer" />
            <Form.Dropdown.Item
              value="pixelCelebration"
              title="Pixel Celebration"
            />
            <Form.Dropdown.Item value="custom" title="Custom Prompt" />
          </Form.Dropdown>

          <Form.TextArea
            id="customPrompt"
            title="Custom Prompt"
            placeholder="8-bit pixel art style, vibrant colors..."
            info="Only used when Preset Style is set to 'Custom'"
          />
        </>
      ) : (
        <>
          <Form.TextField
            id="logoType"
            title="Logo Type"
            placeholder="例: LGTMのロゴ"
            defaultValue="LGTMのロゴ"
            info="作成するロゴの種類を入力"
          />

          <Form.TextField
            id="fontStyle"
            title="Font Style"
            placeholder="例: 幾何学的で太字のサンセリフ体（Futura／Helvetica系相当）"
            defaultValue="幾何学的で太字のサンセリフ体"
            info="フォントスタイルを指定"
          />

          <Form.TextField
            id="mainElement"
            title="Main Element"
            placeholder="例: からあげ、猫、宇宙、オフィス"
            defaultValue="からあげ"
            info="画像に含める主要な要素"
          />

          <Form.TextField
            id="colorScheme"
            title="Color Scheme"
            placeholder="例: 画像をもとに、パステルカラー、モノクロ"
            defaultValue="画像をもとに"
            info="配色の設定方法"
          />
        </>
      )}

      <Form.TextField
        id="text"
        title="Text Overlay"
        placeholder="LGTM"
        defaultValue="LGTM"
        info="Text to overlay on the image"
      />

      <Form.Dropdown id="fontSize" title="Font Size" defaultValue="large">
        <Form.Dropdown.Item value="small" title="Small" />
        <Form.Dropdown.Item value="medium" title="Medium" />
        <Form.Dropdown.Item value="large" title="Large" />
      </Form.Dropdown>

      <Form.Dropdown id="size" title="Image Size" defaultValue="1024">
        <Form.Dropdown.Item value="512" title="512x512" />
        <Form.Dropdown.Item value="1024" title="1024x1024" />
      </Form.Dropdown>

      <Form.FilePicker
        id="styleImage"
        title="Style/Input Image"
        info="Optional: Custom image for style reference or editing"
        allowMultipleSelection={false}
        canChooseDirectories={false}
      />
    </Form>
  );
}
