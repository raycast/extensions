import { describe, expect, it } from "vitest";

import { sanitizeContentTypeForShell } from "../src/lib/upload-spawn";

describe("sanitizeContentTypeForShell", () => {
  it("passes through standard MIME types", () => {
    expect(sanitizeContentTypeForShell("video/mp4")).toBe("video/mp4");
    expect(sanitizeContentTypeForShell("audio/mpeg")).toBe("audio/mpeg");
    expect(sanitizeContentTypeForShell("image/jpeg")).toBe("image/jpeg");
  });

  it("trims surrounding whitespace", () => {
    expect(sanitizeContentTypeForShell("  video/mp4  ")).toBe("video/mp4");
  });

  it("falls back when the value is not a safe type/subtype pair", () => {
    expect(sanitizeContentTypeForShell('video/mp4"; rm -rf /')).toBe("application/octet-stream");
    expect(sanitizeContentTypeForShell("not-a-mime")).toBe("application/octet-stream");
    expect(sanitizeContentTypeForShell("")).toBe("application/octet-stream");
  });
});
