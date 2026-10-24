import { describe, it, expect } from "vitest";
import * as path from "node:path";
import { uniqueFilePath } from "../src/lib/unique-path";

describe("uniqueFilePath", () => {
  const folder = "/out";
  const taken = (...names: string[]) => (p: string) => names.map((n) => path.join(folder, n)).includes(p);

  it("uses the plain name when it's free", () => {
    expect(uniqueFilePath(folder, "Talk", "txt", taken())).toBe("/out/Talk.txt");
  });

  it("numbers the name instead of overwriting an existing file", () => {
    expect(uniqueFilePath(folder, "Talk", "txt", taken("Talk.txt"))).toBe("/out/Talk (2).txt");
    expect(uniqueFilePath(folder, "Talk", "txt", taken("Talk.txt", "Talk (2).txt"))).toBe("/out/Talk (3).txt");
  });
});
