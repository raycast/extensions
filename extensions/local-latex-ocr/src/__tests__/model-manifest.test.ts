import { describe, expect, it } from "vitest";
import { MODEL_ASSETS } from "../lib/model";

describe("model manifest", () => {
  it("pins every upstream artifact by HTTPS URL, size, and SHA-256", () => {
    expect(MODEL_ASSETS).toHaveLength(11);
    for (const asset of MODEL_ASSETS) {
      expect(asset.url).toMatch(
        /^https:\/\/huggingface\.co\/onnx-community\/TexTeller3-ONNX\/resolve\/ed90c6164810242882ca90863bb85697a76f4841\//,
      );
      expect(asset.size).toBeGreaterThan(0);
      expect(asset.sha256).toMatch(/^[a-f0-9]{64}$/);
    }
  });
});
