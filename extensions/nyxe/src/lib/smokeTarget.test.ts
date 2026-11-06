import { describe, expect, it } from "vitest";
import { smokeBaseUrl } from "./smokeTarget";

describe("smokeBaseUrl", () => {
  it.each([
    ["https://convex-site-dev.nyxe.app", "https://convex-site-dev.nyxe.app"],
    ["https://convex-site-dev.nyxe.app/", "https://convex-site-dev.nyxe.app"],
    ["http://localhost:3211", "http://localhost:3211"],
    ["http://127.0.0.1:3211/", "http://127.0.0.1:3211"],
  ])("allows %s", (raw, origin) => {
    expect(smokeBaseUrl(raw)).toBe(origin);
  });

  it.each([
    "https://convex-site.nyxe.app",
    "https://convex-site.nyxe.app:443",
    "https://convex-site.nyxe.app ",
    " https://convex-site-dev.nyxe.app",
    "https://convex-site.nyxe.app./",
    "https://CONVEX-SITE.nyxe.app",
    "https://convex-site-dev.nyxe.app.evil.example",
    "https://evil.example/?h=convex-site-dev.nyxe.app",
    "https://convex-site-dev.nyxe.app:8443",
    "http://convex-site-dev.nyxe.app",
    "https://user@convex-site-dev.nyxe.app",
    "https://convex-site-dev.nyxe.app/api",
    "not a url",
    "",
    undefined,
  ])("refuses %s", (raw) => {
    expect(smokeBaseUrl(raw)).toBeNull();
  });
});
