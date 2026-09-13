import { beforeEach, expect, it, vi } from "vitest";
vi.mock("../src/emoji-art", () => ({ emojiToAscii: vi.fn() }));
import { emojiToAscii } from "../src/emoji-art";
import { renderCoolText } from "../src/render";
import { transformText } from "../src/transform";

beforeEach(() => vi.resetAllMocks());

it("uses the chosen text font", async () => {
  expect(await renderCoolText("Cool", "ascii", "Slant")).toBe(transformText("Cool", "ascii", "Slant"));
});
it("preserves emoji unchanged in the original style", async () => {
  expect(await renderCoolText("hi 🫶")).toContain("🫶");
  expect(emojiToAscii).not.toHaveBeenCalled();
});
it("renders a joined emoji as one picture", async () => {
  vi.mocked(emojiToAscii).mockResolvedValue("@@\n@@");
  expect(await renderCoolText("👩🏽‍💻", "ascii")).toBe("@@\n@@");
  expect(emojiToAscii).toHaveBeenCalledExactlyOnceWith("👩🏽‍💻", "ascii");
});
it("keeps text and emoji blocks in input order", async () => {
  vi.mocked(emojiToAscii).mockResolvedValue("EMOJI ART");
  expect(await renderCoolText("Hi 😀 Bye", "ascii")).toBe(
    [transformText("Hi ", "ascii"), "EMOJI ART", transformText(" Bye", "ascii")].join("\n\n"),
  );
});
it("does not silently omit emoji on download failure", async () => {
  vi.mocked(emojiToAscii).mockRejectedValue(new Error("Offline"));
  await expect(renderCoolText("Hi 😀", "ascii")).rejects.toThrow("Offline");
});

it("routes emoji through the Unicode dot renderer", async () => {
  vi.mocked(emojiToAscii).mockResolvedValue("⣿⡇");
  expect(await renderCoolText("😀", "dots")).toBe("⣿⡇");
  expect(emojiToAscii).toHaveBeenCalledExactlyOnceWith("😀", "dots");
});

it("rejects too many emoji before starting any downloads", async () => {
  for (const variant of ["ascii", "dots"]) {
    await expect(renderCoolText("😀".repeat(9), variant)).rejects.toThrow("up to 8 emoji");
  }
  expect(emojiToAscii).not.toHaveBeenCalled();
});

it("accepts eight joined emoji as eight pictures", async () => {
  vi.mocked(emojiToAscii).mockResolvedValue("ART");
  expect(await renderCoolText("👩🏽‍💻".repeat(8), "ascii")).toBe(Array(8).fill("ART").join("\n\n"));
  expect(emojiToAscii).toHaveBeenCalledTimes(8);
});

it("starts emoji requests together and retains input order when they finish out of order", async () => {
  let resolveFirst!: (value: string) => void;
  let resolveSecond!: (value: string) => void;
  const first = new Promise<string>((resolve) => {
    resolveFirst = resolve;
  });
  const second = new Promise<string>((resolve) => {
    resolveSecond = resolve;
  });
  vi.mocked(emojiToAscii).mockReturnValueOnce(first).mockReturnValueOnce(second);
  const result = renderCoolText("😀😎", "ascii");
  await vi.waitFor(() => expect(emojiToAscii).toHaveBeenCalledTimes(2));
  resolveSecond("SECOND");
  resolveFirst("FIRST");
  expect(await result).toBe("FIRST\n\nSECOND");
});
