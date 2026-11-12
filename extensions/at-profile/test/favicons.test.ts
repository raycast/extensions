import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { environment } from "@raycast/api";
import { cacheFavicon, faviconFor, faviconKey } from "../src/helpers/favicons";

const PNG = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

describe("faviconKey", () => {
  it("names a site by its host, without www or the profile", () => {
    expect(faviconKey("https://www.github.com/{profile}")).toBe("github.com");
    expect(faviconKey("https://{profile}.substack.com/")).toBe("substack.com");
    expect(faviconKey("not a url")).toBeUndefined();
  });
});

describe("faviconFor", () => {
  it("uses the favicon that ships with the extension", () => {
    expect(faviconFor("https://github.com/{profile}")).toMatchObject({ source: "favicons/github.com.png" });
  });

  it("asks the favicon service for a site it has no copy of", () => {
    expect(faviconFor("https://nowhere.example/{profile}")).toMatchObject({
      source: "favicon:https://nowhere.example",
    });
  });
});

describe("cacheFavicon", () => {
  it("saves a site's favicon and uses it from then on", async () => {
    const fetchImpl = (async () =>
      new Response(PNG, { status: 200, headers: { "content-type": "image/png" } })) as typeof fetch;
    expect(await cacheFavicon("https://saved.example/{profile}", { fetchImpl })).toBe(true);
    const file = join(environment.supportPath, "favicons", "saved.example.png");
    expect(readFileSync(file)).toEqual(Buffer.from(PNG));
    expect(faviconFor("https://saved.example/@{profile}")).toMatchObject({ source: file });
  });

  it("saves nothing when the service answers with something that isn't an image", async () => {
    const fetchImpl = (async () =>
      new Response("not found", { status: 404, headers: { "content-type": "text/plain" } })) as typeof fetch;
    expect(await cacheFavicon("https://missing.example/{profile}", { fetchImpl })).toBe(false);
    expect(existsSync(join(environment.supportPath, "favicons", "missing.example.png"))).toBe(false);
  });

  it("skips an ICO sent as image/png and takes the next service's PNG", async () => {
    // A Windows icon resource's header, as one service sent for facebook.com
    const ICO = Uint8Array.from([0x00, 0x00, 0x01, 0x00, 0x03, 0x00, 0x10, 0x10]);
    const answers = [ICO, PNG];
    const fetchImpl = (async () =>
      new Response(answers.shift(), { headers: { "content-type": "image/png" } })) as typeof fetch;
    expect(await cacheFavicon("https://ico.example/{profile}", { fetchImpl })).toBe(true);
    const saved = readFileSync(join(environment.supportPath, "favicons", "ico.example.png"));
    expect([...saved.subarray(0, 8)]).toEqual([...PNG]);
  });

  it("doesn't download a favicon that ships with the extension", async () => {
    let requests = 0;
    const fetchImpl = (async () => {
      requests++;
      return new Response(PNG, { headers: { "content-type": "image/png" } });
    }) as typeof fetch;
    expect(await cacheFavicon("https://github.com/{profile}", { fetchImpl })).toBe(true);
    expect(requests).toBe(0);
  });
});
