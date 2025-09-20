import Jimp from "jimp";
import { writeFile, mkdir } from "fs/promises";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { existsSync } from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function createDefaultAssets() {
  const assetsDir = join(__dirname, "assets");
  
  if (!existsSync(assetsDir)) {
    await mkdir(assetsDir, { recursive: true });
  }
  
  const icon = new Jimp(512, 512, 0xFF4FC3F7);
  
  for (let y = 0; y < 512; y += 32) {
    for (let x = 0; x < 512; x += 32) {
      const isEvenRow = Math.floor(y / 32) % 2 === 0;
      const isEvenCol = Math.floor(x / 32) % 2 === 0;
      if ((isEvenRow && isEvenCol) || (!isEvenRow && !isEvenCol)) {
        for (let dy = 0; dy < 32; dy++) {
          for (let dx = 0; dx < 32; dx++) {
            icon.setPixelColor(0xFF40A0F7, x + dx, y + dy);
          }
        }
      }
    }
  }
  
  const heartPixels = [
    "  XX  XX  ",
    " XXXX XXXX",
    "XXXXXXXXXX",
    "XXXXXXXXXX",
    " XXXXXXXX ",
    "  XXXXXX  ",
    "   XXXX   ",
    "    XX    ",
  ];
  
  const pixelSize = 20;
  const heartStartX = 256 - (heartPixels[0].length * pixelSize) / 2;
  const heartStartY = 180;
  
  heartPixels.forEach((row, y) => {
    row.split("").forEach((pixel, x) => {
      if (pixel === "X") {
        for (let dy = 0; dy < pixelSize; dy++) {
          for (let dx = 0; dx < pixelSize; dx++) {
            icon.setPixelColor(0xFFFF0066, heartStartX + x * pixelSize + dx, heartStartY + y * pixelSize + dy);
          }
        }
      }
    });
  });
  
  const iconBuffer = await icon.getBufferAsync(Jimp.MIME_PNG);
  await writeFile(join(assetsDir, "icon.png"), iconBuffer);
  console.log("Created icon.png");
  
  const styleImage = new Jimp(512, 512, 0xFF00CED1);
  
  const characterPixels = [
    "    XXXX    ",
    "   XXXXXX   ",
    "  XX XX XX  ",
    "  XXXXXXXX  ",
    "   X    X   ",
    "  XXXXXXXX  ",
    " XX XXXX XX ",
    "XX   XX   XX",
    "     XX     ",
    "    XXXX    ",
    "   XX  XX   ",
  ];
  
  const charPixelSize = 16;
  const charStartX = 256 - (characterPixels[0].length * charPixelSize) / 2;
  const charStartY = 150;
  
  characterPixels.forEach((row, y) => {
    row.split("").forEach((pixel, x) => {
      if (pixel === "X") {
        for (let dy = 0; dy < charPixelSize; dy++) {
          for (let dx = 0; dx < charPixelSize; dx++) {
            styleImage.setPixelColor(0xFF2E3440, charStartX + x * charPixelSize + dx, charStartY + y * charPixelSize + dy);
          }
        }
      }
    });
  });
  
  const smallHeartPixels = [
    " XX XX ",
    "XXXXXXX",
    " XXXXX ",
    "  XXX  ",
    "   X   ",
  ];
  
  const smallPixelSize = 8;
  const smallHeartX = 256 - (smallHeartPixels[0].length * smallPixelSize) / 2;
  const smallHeartY = 100;
  
  smallHeartPixels.forEach((row, y) => {
    row.split("").forEach((pixel, x) => {
      if (pixel === "X") {
        for (let dy = 0; dy < smallPixelSize; dy++) {
          for (let dx = 0; dx < smallPixelSize; dx++) {
            styleImage.setPixelColor(0xFFFF0066, smallHeartX + x * smallPixelSize + dx, smallHeartY + y * smallPixelSize + dy);
          }
        }
      }
    });
  });
  
  const styleBuffer = await styleImage.getBufferAsync(Jimp.MIME_PNG);
  await writeFile(join(assetsDir, "pixel-heart-style.png"), styleBuffer);
  console.log("Created pixel-heart-style.png");
  
  console.log("✅ Default assets created successfully!");
}

createDefaultAssets().catch(console.error);