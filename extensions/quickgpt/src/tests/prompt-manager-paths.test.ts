import path from "path";
import { isPathInsideDirectory } from "../managers/prompt-manager";

describe("temporary prompt directory ownership", () => {
  const temporaryDirectory = path.join(path.sep, "tmp", "quickgpt-temp");

  it("matches files inside the temporary directory", () => {
    expect(isPathInsideDirectory(path.join(temporaryDirectory, "nested", "prompt.hjson"), temporaryDirectory)).toBe(
      true,
    );
  });

  it("does not match a sibling directory with the same lexical prefix", () => {
    const siblingPrompt = path.join(`${temporaryDirectory}-archive`, "prompt.hjson");
    expect(isPathInsideDirectory(siblingPrompt, temporaryDirectory)).toBe(false);
  });

  it("allows child names beginning with two dots", () => {
    const childPrompt = path.join(temporaryDirectory, "..draft", "prompt.hjson");
    expect(isPathInsideDirectory(childPrompt, temporaryDirectory)).toBe(true);
  });
});
