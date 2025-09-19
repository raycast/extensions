const { GoogleGenerativeAI } = require("@google/generative-ai");
const { readFile } = require("node:fs/promises");

async function generateImage(opts) {
  const genAI = new GoogleGenerativeAI(opts.apiKey);

  // Use gemini-2.0-flash-thinking-exp for image generation (Nano Banana)
  const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash-thinking-exp-1219",
    generationConfig: {
      temperature: 0.9,
      topP: 0.95,
      topK: 40,
    },
  });

  const parts = [
    {
      text: `${opts.prompt}
      
      CRITICAL REQUIREMENTS:
      - Create an 8-bit pixel art style image
      - Use solid, flat colors with thick outlines
      - Leave clear space in the center for overlaying text
      - DO NOT render any text in the image
      - Make the composition simple and iconic
      - Size: ${opts.size || 1024}x${opts.size || 1024} pixels`,
    },
  ];

  if (opts.styleImagePath) {
    try {
      const imageData = await readFile(opts.styleImagePath);
      parts.push({
        inlineData: {
          mimeType: "image/png",
          data: imageData.toString("base64"),
        },
      });
      parts[0].text = `${parts[0].text}\n\nUse the attached image as a style reference. Match its 8-bit pixel art aesthetic, color palette, and composition style.`;
    } catch (error) {
      console.error("Failed to read style image:", error);
    }
  }

  try {
    const result = await model.generateContent({
      contents: [{ role: "user", parts }],
    });

    const response = result.response;
    const text = response.text();

    if (text.includes("data:image/png;base64,")) {
      const base64Data = text
        .split("data:image/png;base64,")[1]
        .split(/["\s]/)[0];
      return Buffer.from(base64Data, "base64");
    }

    const candidates = response.candidates;
    if (candidates && candidates[0]) {
      const content = candidates[0].content;
      if (content && content.parts) {
        for (const part of content.parts) {
          if (part.inlineData?.mimeType?.startsWith("image/")) {
            return Buffer.from(part.inlineData.data, "base64");
          }
        }
      }
    }

    throw new Error("No image generated from Gemini API");
  } catch (error) {
    throw new Error(`Gemini API error: ${error.message || error}`);
  }
}

const PRESET_PROMPTS = {
  pixelHeartBoy:
    "8-bit pixel art character bust-up with red heart above hair, cyan/blue solid background, cheerful expression",
  pixelGalaxy:
    "8-bit pixel art dark blue space background with scattered stars and nebula, empty center area",
  pixelOffice:
    "8-bit pixel art cozy office scene with desk, computer, coffee mug, warm lighting",
  pixelCat:
    "8-bit pixel art cute cat programmer with glasses and keyboard, pastel background",
  pixelCelebration:
    "8-bit pixel art festive confetti and party decorations, bright colors",
};

module.exports = {
  generateImage,
  PRESET_PROMPTS,
};
