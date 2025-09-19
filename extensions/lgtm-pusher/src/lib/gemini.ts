import { readFile } from "node:fs/promises";
import { GoogleGenerativeAI } from "@google/generative-ai";

export type GenImageOpts = {
  apiKey: string;
  prompt: string; // ユーザープロンプト（プリセット + 追加条件）
  styleImagePath?: string; // スタイル参照画像（任意）
  size?: 512 | 1024; // 出力サイズ（正方形想定）
  negativePrompt?: string; // 不要要素
  isEdit?: boolean; // 画像編集(参照画像を直接変換)か
};

// Gemini 2.5 Flash Image (a.k.a nano banana) preview model 名称
const DEFAULT_IMAGE_MODEL = "gemini-2.5-flash-image-preview";

/**
 * Gemini 画像生成
 * - parts に text + (任意) style 参照画像を渡す
 * - 返却: 生成 PNG バイナリ Buffer
 */
export async function generateImage(opts: GenImageOpts): Promise<Buffer> {
  // 呼び出し側で未指定の場合、プロンプト中に 'Edit / transform' などが含まれるかで推定
  if (opts.isEdit === undefined) {
    opts.isEdit = /edit|transform/i.test(opts.prompt);
  }
  const genAI = new GoogleGenerativeAI(opts.apiKey);
  const model = genAI.getGenerativeModel({ model: DEFAULT_IMAGE_MODEL });

  const size = opts.size || 1024;
  const systemGuidance = opts.isEdit
    ? `You are editing / transforming the provided reference image. Maintain core composition and recognizable elements unless the user prompt explicitly asks to change them. STRICT RULES: (1) If the prompt requests text, render it clearly and prominently. (2) Keep pixel art readable and clean. (3) Output only image data (no markdown).`
    : `You generate a NEW clean, simple 8-bit pixel art image. STRICT RULES: (1) If the prompt requests text (like "LGTM"), render it clearly in the center. (2) Use bold, geometric fonts for any text. (3) Use a cohesive limited color palette. (4) Output only image data (no markdown).`;

  const basePrompt = `${opts.prompt}\n\nOutput requirements:\n- 8-bit pixel art aesthetic\n- Provide a balanced composition\n- High contrast but not noisy\n- Square ${size}x${size}\n- If text is requested in the prompt, render it clearly and prominently`;

  const parts: any[] = [{ text: `${systemGuidance}\n\n${basePrompt}` }];

  if (opts.styleImagePath) {
    try {
      const img = await readFile(opts.styleImagePath);
      parts.push({
        inlineData: {
          mimeType: "image/png",
          data: img.toString("base64"),
        },
      });
      parts.push({
        text: "Use the provided image ONLY as stylistic / palette reference. Keep central negative space clean for later 'LGTM' overlay.",
      });
    } catch (e) {
      console.warn("style image read failed", e);
    }
  }

  if (opts.negativePrompt) {
    parts.push({
      text: `Negative (avoid): ${opts.negativePrompt}`,
    });
  }

  try {
    const result = await model.generateContent({
      contents: [
        {
          role: "user",
          parts,
        },
      ],
    });

    const response = result.response;
    const candidates = response.candidates || [];
    for (const c of candidates) {
      const cp = c.content?.parts || [];
      for (const p of cp) {
        if (p.inlineData?.mimeType?.startsWith("image/")) {
          return Buffer.from(p.inlineData.data, "base64");
        }
        // fallback: 一部モデルが text 内に data URI を埋める可能性
        if (p.text && p.text.includes("data:image")) {
          const match = p.text.match(
            /data:image\/png;base64,([A-Za-z0-9+/=]+)/,
          );
          if (match) return Buffer.from(match[1], "base64");
        }
      }
    }
    throw new Error("Gemini image generation returned no image parts");
  } catch (err: any) {
    throw new Error(`Gemini image generation failed: ${err.message || err}`);
  }
}

export const PRESET_PROMPTS = {
  pixelHeartBoy:
    "Bust-up pixel art character with a red heart floating above head, cyan / blue flat background, cheerful, clean negative space center",
  pixelGalaxy:
    "Deep space pixel art with sparse bright stars and nebulous gradients, dark navy / indigo palette, empty center",
  pixelOffice:
    "Cozy programmer desk scene pixel art, warm lamp light, monitor glow, subtle background details, focus left/right edges",
  pixelCat:
    "Cute pixel art cat programmer with glasses at keyboard, soft pastel background, simple framing",
  pixelCelebration:
    "Festive pixel art with confetti arcs at edges, bright saturated palette, clear open center",
};
