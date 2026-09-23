import { listBlobs, readBlob } from "../lib/api";
import { requireAllowed } from "../lib/allowed";

type Input = {
  /** The val as `handle/valName`, exactly as list-tools returned it. */
  val: string;
  /** A key from the listing to read in full. Omit to list the val's blobs. */
  key?: string;
};

/** This extension's own config lives under this prefix; it is plumbing, not the val's data. */
const INTERNAL_PREFIX = "raycast:";

export default async function readValBlobs(input: Input) {
  await requireAllowed(input.val);
  const storage = { type: "val", val: input.val } as const;

  if (input.key) {
    const blob = await readBlob(storage, input.key);
    return { val: input.val, key: input.key, content: (blob.content ?? "").slice(0, 40000) };
  }

  const { blobs } = await listBlobs(storage);
  const listed = blobs.filter((blob) => !blob.key.startsWith(INTERNAL_PREFIX));

  return {
    val: input.val,
    blobs: listed.map((blob) => ({ key: blob.key, size: blob.size ?? null })),
    note: listed.length === 0 ? "This val has no blobs." : "Call again with a key to read one.",
  };
}
