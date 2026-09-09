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

it("keeps letter size consistent across explicit lines", async () => {
  const single = await textToDots("Cool");
  expect(await textToDots("Cool\nCool")).toBe(`${single}\n${single}`);
  expect(await textToDots("Cool\r\nCool")).toBe(`${single}\n${single}`);
});

it("wraps long words without dropping their final characters", async () => {
  const fullLine = await textToDots("WW");
  const lastLetter = await textToDots("W");
  expect(await textToDots("WWWWWWW")).toBe(`${fullLine}\n${fullLine}\n${fullLine}\n${lastLetter}`);
});

it("preserves blank lines and handles empty input", async () => {
  expect(await textToDots(" \n ")).toBe("");
  const single = await textToDots("Cool");
  expect(await textToDots("Cool\n\nCool")).toBe(`${single}\n⠀\n${single}`);
});

it("bounds text work before rasterization", async () => {
  const { MAX_DOT_TEXT_LENGTH } = await import("../src/dot-text");
  await expect(textToDots("A".repeat(MAX_DOT_TEXT_LENGTH + 1))).rejects.toThrow("up to 500");
});

it("offers more dot resolution while retaining a compact option", async () => {
  const compact = await textToDots("Cool", "Compact");
  const detailed = await textToDots("Cool", "Detailed");
  expect(detailed.split("\n").length).toBeGreaterThan(compact.split("\n").length);
  expect(detailed.split("\n")[0].length).toBeGreaterThan(compact.split("\n")[0].length);
});
