import { expect, it, vi } from "vitest";
vi.mock("@raycast/api", () => ({ environment: { assetsPath: `${process.cwd()}/assets` } }));
import { textToDots } from "../src/dot-text";

it("renders text using the bundled font without a network request", async () => {
  const result = await textToDots("Cool");
  expect(result).toMatch(/^[\u2800-\u28ff\n]+$/);
  expect(result).not.toMatch(/^[⠀\n]+$/);
});
it("rejects missing glyphs instead of silently dropping them", async () => {
  await expect(textToDots("漢字")).rejects.toThrow("does not support");
});
