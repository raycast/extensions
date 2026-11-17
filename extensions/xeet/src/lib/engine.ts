import { bind, type Post, type RenderOptions, type Report, type Resolved, type Xeet } from "@xeet/core";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";
import packs from "../../assets/xeet/fonts/packs.json";
import { normalizePostUrl } from "./input";
import { createNetworkHost } from "./network";

export interface Engine {
  explain(post: Post, options?: RenderOptions, signal?: AbortSignal): Promise<Report>;
  render(post: Post, options?: RenderOptions): Promise<{ png: Buffer; report: Report }>;
  renderMany(post: Post, options: RenderOptions[]): Promise<{ png: Buffer; report: Report }[]>;
  sheet(request: { post: Post; widths: number[]; themes: ("light" | "dark")[]; dpr: number }): Promise<Buffer>;
  resolve(url: string, options: RenderOptions, signal: AbortSignal): Promise<Resolved>;
}

export function loadEngine(assetsPath: string): Engine {
  let renderer: Xeet | undefined;
  function getRenderer(): Xeet {
    if (renderer) return renderer;
    const directory = join(assetsPath, "xeet");
    const requireAsset = createRequire(join(directory, "package.json"));
    const wasm = requireAsset("./xeet_wasm.js") as { register_font(file: string, bytes: Uint8Array): void };
    for (const [name, pack] of Object.entries(packs.packs)) {
      const bytes = readFileSync(join(directory, "fonts", `${name}.bin`));
      if (createHash("sha256").update(bytes).digest("hex") !== pack.sha256)
        throw new Error(`The bundled ${name} font pack is damaged. Reinstall the extension.`);
      for (const file of pack.files)
        wasm.register_font(file.file, bytes.subarray(file.offset, file.offset + file.length));
    }
    return (renderer = bind(wasm));
  }

  return {
    async explain(post, options, signal) {
      signal?.throwIfAborted();
      return getRenderer().explain(post, options);
    },
    async render(post, options) {
      const { png, report } = getRenderer().render(post, options);
      return { png: Buffer.from(png), report };
    },
    async renderMany(post, options) {
      return getRenderer()
        .renderMany(post, options)
        .map(({ png, report }) => ({ png: Buffer.from(png), report }));
    },
    async sheet(request) {
      return Buffer.from(getRenderer().sheet(request));
    },
    async resolve(url, options, signal) {
      const normalized = normalizePostUrl(url);
      signal.throwIfAborted();
      const network = createNetworkHost(AbortSignal.any([signal, AbortSignal.timeout(20_000)]));
      try {
        return await getRenderer().resolve(normalized, { ...options, media: true, maxLinks: 0 }, network.host);
      } finally {
        await network.close();
      }
    },
  };
}
