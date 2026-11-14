import { z } from "zod";
import { batchSchema, manifestSchema, MUSEUM_URL, type Artwork, type Manifest } from "./artworks";

const metadataSchema = z.object({ checkedAt: z.number().finite(), manifest: manifestSchema });

type Catalog = { artworks: Artwork[]; checkedAt: number; stale: boolean };
type CatalogStorage = {
  read: (key: string) => Promise<unknown>;
  write: (key: string, value: unknown) => Promise<void>;
};

export function createCatalogLoader({
  storage,
  fetchJson,
  now = Date.now,
}: {
  storage: CatalogStorage;
  fetchJson: (url: string) => Promise<unknown>;
  now?: () => number;
}) {
  let pending: { promise: Promise<Catalog>; forced: boolean } | undefined;

  async function readMetadata() {
    try {
      return metadataSchema.parse(await storage.read("manifest.json"));
    } catch {
      return undefined;
    }
  }

  async function readBatch(file: string, count: number) {
    const artworks = batchSchema.parse(await storage.read(file));
    if (artworks.length !== count) throw new Error("Incomplete cached artwork batch");
    return artworks;
  }

  function combine(manifest: Manifest, batches: Artwork[][]) {
    const artworks = batches.flat();
    if (artworks.length !== manifest.total || new Set(artworks.map((artwork) => artwork.id)).size !== artworks.length) {
      throw new Error("Museum's catalog is incomplete. Try refreshing again later.");
    }
    return artworks;
  }

  async function load(refreshMs: number, force: boolean): Promise<Catalog> {
    const metadata = await readMetadata();
    let previous: Artwork[] | undefined;
    if (metadata) {
      try {
        previous = combine(
          metadata.manifest,
          await Promise.all(metadata.manifest.batches.map((batch) => readBatch(batch.file, batch.count))),
        );
      } catch {
        /* Repair a missing or corrupt batch from the network. */
      }
      if (previous && !force && now() - metadata.checkedAt < refreshMs)
        return { artworks: previous, checkedAt: metadata.checkedAt, stale: false };
    }
    try {
      const manifest = manifestSchema.parse(await fetchJson(`${MUSEUM_URL}/catalog/manifest.json`));
      const batches = await Promise.all(
        manifest.batches.map(async ({ file, count }) => {
          try {
            return await readBatch(file, count);
          } catch {
            /* Content-hashed batches only need downloading once. */
          }
          const artworks = batchSchema.parse(await fetchJson(`${MUSEUM_URL}/catalog/${file}`));
          if (artworks.length !== count) throw new Error("Museum returned an incomplete artwork batch");
          await storage.write(file, artworks);
          return artworks;
        }),
      );
      const artworks = combine(manifest, batches);
      const checkedAt = now();
      await storage.write("manifest.json", { manifest, checkedAt });
      return { artworks, checkedAt, stale: false };
    } catch (error) {
      if (previous && metadata) return { artworks: previous, checkedAt: metadata.checkedAt, stale: true };
      throw new Error(
        "Could not load Museum's catalog. Check your connection and try again. The catalog may also have changed format.",
        { cause: error },
      );
    }
  }

  return (refreshMs: number, force = false): Promise<Catalog> => {
    if (pending && (!force || pending.forced)) return pending.promise;

    const run = () => load(refreshMs, force);
    const promise = (pending ? pending.promise.then(run, run) : run()).finally(() => {
      if (pending?.promise === promise) pending = undefined;
    });
    pending = { promise, forced: force };
    return promise;
  };
}
