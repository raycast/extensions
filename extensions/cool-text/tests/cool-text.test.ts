import { beforeEach, expect, it, vi } from "vitest";

vi.mock("@raycast/api", () => ({
  Clipboard: { copy: vi.fn() },
  showHUD: vi.fn(),
}));

import { Clipboard, showHUD } from "@raycast/api";
import Command from "../src/cool-text";

function run(text: string, variant = "alphabet") {
  return Command({ text, variant });
}

beforeEach(() => vi.resetAllMocks());

it("automatically copies the chosen style and confirms success", async () => {
  await run("hi", "alphabet");
  expect(Clipboard.copy).toHaveBeenCalledExactlyOnceWith(":alphabet-yellow-h::alphabet-white-i:");
  expect(showHUD).toHaveBeenCalledWith("CoolText copied");
});

it("defaults to the original style when the optional style is empty", async () => {
  await run("a", "");
  expect(Clipboard.copy).toHaveBeenCalledWith(":alphabet-yellow-a:");
});

it("leaves the clipboard untouched for blank input", async () => {
  await run(" \n ");
  expect(Clipboard.copy).not.toHaveBeenCalled();
  expect(showHUD).toHaveBeenCalledWith("Enter some text to copy");
});

it("does not copy or claim success when a transform fails", async () => {
  await run("漢字", "ascii");
  expect(Clipboard.copy).not.toHaveBeenCalled();
  expect(showHUD).not.toHaveBeenCalledWith("CoolText copied");
});

it("reports clipboard failure without claiming success", async () => {
  vi.mocked(Clipboard.copy).mockRejectedValueOnce(new Error("clipboard unavailable"));
  await run("hello");
  expect(showHUD).toHaveBeenCalledExactlyOnceWith("Could not copy text. Please try again.");
});
