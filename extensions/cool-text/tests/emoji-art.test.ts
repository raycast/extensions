import { expect, it } from "vitest";
import { emojiAssetName } from "../src/emoji-art";

it("matches simple emoji and removes presentation selectors", () => {
  expect(emojiAssetName("❤️")).toBe("2764");
  expect(emojiAssetName("1️⃣")).toBe("31-20e3");
});
it("preserves joined sequences, skin tones, and region indicators", () => {
  expect(emojiAssetName("👩🏽‍💻")).toBe("1f469-1f3fd-200d-1f4bb");
  expect(emojiAssetName("🏳️‍🌈")).toBe("1f3f3-fe0f-200d-1f308");
  expect(emojiAssetName("🇻🇳")).toBe("1f1fb-1f1f3");
});
