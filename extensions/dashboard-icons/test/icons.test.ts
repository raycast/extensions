import { describe, expect, it } from "vitest";
import {
  aboutIcon,
  authorUrl,
  availableFormats,
  displayTitle,
  fileNameFor,
  formatDate,
  groupIconFiles,
  orderedFormats,
  primaryFile,
  variantLabel,
} from "../src/lib/icons";
import { parseGetIcon } from "../src/lib/mcp";
import { IconDetails } from "../src/lib/types";
import { iconNtfy, iconPngOnly, iconPortabase, iconSimpleIcons } from "./fixtures";

function details(payload: unknown): IconDetails {
  const result = parseGetIcon(payload);
  if (!result.found) throw new Error("fixture not found");
  return result.icon;
}

describe("orderedFormats", () => {
  it("puts the preferred format first and keeps WebP, PNG, SVG order otherwise", () => {
    expect(orderedFormats("webp")).toEqual(["webp", "png", "svg"]);
    expect(orderedFormats("svg")).toEqual(["svg", "webp", "png"]);
    expect(orderedFormats("png")).toEqual(["png", "webp", "svg"]);
  });
});

describe("variantLabel", () => {
  it("labels well-known and custom variants", () => {
    expect(variantLabel("default")).toBe("Base");
    expect(variantLabel("light")).toBe("Light");
    expect(variantLabel("wordmark-dark")).toBe("Wordmark Dark");
    expect(variantLabel("4k")).toBe("4K");
    expect(variantLabel("high_contrast")).toBe("High Contrast");
  });
});

describe("fileNameFor", () => {
  it("keeps the CDN file name", () => {
    expect(
      fileNameFor(
        "portabase",
        "dark",
        "webp",
        "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/webp/portabase-dark.webp",
      ),
    ).toBe("portabase-dark.webp");
  });

  it("derives a name when the URL has no matching extension", () => {
    expect(fileNameFor("githubpages", "default", "svg", "https://cdn.simpleicons.org/githubpages/222222")).toBe(
      "githubpages.svg",
    );
    expect(fileNameFor("githubpages", "light", "png", "https://example.com/x/dark.png")).toBe("dark.png");
    expect(fileNameFor("githubpages", "light", "svg", "https://cdn.simpleicons.org/githubpages/FFFFFF")).toBe(
      "githubpages-light.svg",
    );
  });

  it("sanitizes unsafe characters", () => {
    expect(fileNameFor("a/b c", "default", "svg", "not a url")).toBe("a-b-c.svg");
  });

  it("never produces hidden or relative file names", () => {
    expect(fileNameFor("x", "default", "svg", "https://cdn.example.com/%2e%2e%2f%2e%2e%2fevil.svg")).toBe("evil.svg");
    expect(fileNameFor("x", "default", "svg", "https://cdn.example.com/.hidden.svg")).toBe("hidden.svg");
    expect(fileNameFor("..", "default", "png", "https://cdn.example.com/a")).toBe("icon.png");
  });
});

describe("groupIconFiles", () => {
  it("offers Base as WebP, PNG and SVG for ntfy, WebP first", () => {
    const groups = groupIconFiles(details(iconNtfy));
    expect(groups.map((group) => group.label)).toEqual(["Base"]);
    expect(groups[0].files.map((file) => file.format)).toEqual(["webp", "png", "svg"]);
    expect(groups[0].files[0]).toMatchObject({
      fileName: "ntfy.webp",
      url: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/webp/ntfy.webp",
    });
  });

  it("offers Base, Light and Dark (plus wordmarks) for portabase", () => {
    const groups = groupIconFiles(details(iconPortabase));
    expect(groups.map((group) => group.label)).toEqual(["Base", "Light", "Dark", "Wordmark Light", "Wordmark Dark"]);
    expect(groups.find((group) => group.variant === "light")?.hint).toBe("For dark backgrounds");
    expect(groups.find((group) => group.variant === "dark")?.files.map((file) => file.fileName)).toEqual([
      "portabase-dark.webp",
      "portabase-dark.png",
      "portabase-dark.svg",
    ]);
  });

  it("respects the preferred format", () => {
    const groups = groupIconFiles(details(iconPortabase), "svg");
    expect(groups[0].files.map((file) => file.format)).toEqual(["svg", "webp", "png"]);
  });

  it("only lists formats that exist", () => {
    const icon = details(iconPngOnly);
    expect(availableFormats(icon)).toEqual(["webp", "png"]);
    expect(groupIconFiles(icon)[0].files.map((file) => file.format)).toEqual(["webp", "png"]);
  });
});

describe("primaryFile", () => {
  it("returns the base file in the preferred format", () => {
    expect(primaryFile(details(iconNtfy))?.fileName).toBe("ntfy.webp");
    expect(primaryFile(details(iconNtfy), "svg")?.fileName).toBe("ntfy.svg");
  });

  it("falls back to another format when the preferred one is missing", () => {
    expect(primaryFile(details(iconPngOnly), "svg")?.fileName).toBe("premium-mobile.webp");
    expect(primaryFile(details(iconSimpleIcons), "webp")?.fileName).toBe("brand.png");
  });
});

describe("about this icon", () => {
  it("matches the website text for portabase", () => {
    expect(aboutIcon(details(iconPortabase))).toEqual([
      "Available in 3 formats (SVG, PNG, WEBP) with a base format of SVG. Includes both light and dark theme variants for better integration with different UI designs. Wordmark variants are also available for enhanced branding options.",
      "Perfect for adding to dashboards, app directories, documentation, or anywhere you need the Portabase logo.",
    ]);
  });

  it("describes PNG-based icons without variants", () => {
    expect(aboutIcon(details(iconPngOnly))[0]).toBe("Available in 2 formats (PNG, WEBP) with a base format of PNG.");
    expect(displayTitle(details(iconPngOnly))).toBe("Premium Mobile");
  });

  it("names the external provider", () => {
    const about = aboutIcon(details(iconSimpleIcons));
    expect(about[0]).toBe(
      "Available in 2 formats (SVG, PNG). Includes both light and dark theme variants for better integration with different UI designs.",
    );
    expect(about[2]).toBe("External icon provided by Simple Icons.");
    expect(displayTitle(details(iconSimpleIcons))).toBe("GitHub Pages");
  });
});

describe("author", () => {
  it("links native authors to their GitHub profile", () => {
    expect(authorUrl(details(iconPortabase))).toBe("https://github.com/Asuniia");
  });

  it("does not link names that are not GitHub logins", () => {
    expect(authorUrl({ ...details(iconPortabase), author: "Théo LAGACHE" })).toBeUndefined();
    expect(authorUrl({ ...details(iconPortabase), author: null })).toBeUndefined();
  });

  it("links external authors to their catalog", () => {
    expect(authorUrl(details(iconSimpleIcons))).toBe("https://simpleicons.org/");
  });

  it("formats update dates like the website", () => {
    expect(formatDate("2026-08-24T12:36:05.284Z")).toBe("24 August 2026");
    expect(formatDate("2026-10-11 10:21:38.000Z")).toBe("11 October 2026");
    expect(formatDate("nonsense")).toBeUndefined();
    expect(formatDate(null)).toBeUndefined();
  });
});
