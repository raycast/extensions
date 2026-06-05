import { describe, expect, it } from "vitest";
import { parseNetrcPassword } from "./netrc";

describe("parseNetrcPassword", () => {
  it("extracts the password for a matching machine", () => {
    const content = "machine api.wandb.ai\n  login user\n  password abc123\n";
    expect(parseNetrcPassword(content, "api.wandb.ai")).toBe("abc123");
  });

  it("returns null when the machine is absent", () => {
    const content = "machine github.com login u password p\n";
    expect(parseNetrcPassword(content, "api.wandb.ai")).toBeNull();
  });

  it("does not return another machine's password", () => {
    const content = "machine github.com login u password GH\nmachine api.wandb.ai login a password WB\n";
    expect(parseNetrcPassword(content, "api.wandb.ai")).toBe("WB");
  });

  it("handles a single-line entry", () => {
    const content = "machine api.wandb.ai login api password key42";
    expect(parseNetrcPassword(content, "api.wandb.ai")).toBe("key42");
  });

  it("returns null on empty input", () => {
    expect(parseNetrcPassword("", "api.wandb.ai")).toBeNull();
  });
});
