// Turning files into a link. One file up to 100 MB: the one-call drop (PUT /api/drop/{name}).
// Bigger files, or several files in one link: POST /api/v1/links for a multipart plan, PUT each
// 32 MiB part, then complete each file. A recipient label adds a share for that one person.
import { open, readFile, stat } from "fs/promises";
import { basename } from "path";
import { api, createShare, json, type DropResult, type Expiry, type LinkSummary, type UploadPlan } from "./api";
import { DROP_MAX_BYTES } from "./config";

export type Shared = { url: string; link: LinkSummary; label?: string };

type Options = { label?: string; expiry?: Expiry; onProgress?: (fraction: number) => void };

export async function shareFiles(paths: string[], o: Options = {}): Promise<Shared> {
  if (!paths.length) throw new Error("Pick a file to share");
  const files = await Promise.all(
    paths.map(async (path) => {
      const s = await stat(path);
      if (s.isDirectory()) throw new Error(`${basename(path)} is a folder. Pick files.`);
      return { path, name: basename(path), size: s.size };
    }),
  );
  const label = o.label?.trim() || undefined;

  if (files.length === 1 && files[0].size <= DROP_MAX_BYTES && files[0].size > 0) {
    const f = files[0];
    const q = new URLSearchParams();
    if (label) q.set("label", label);
    if (o.expiry) q.set("expiry", o.expiry);
    o.onProgress?.(0);
    const body = await readFile(f.path);
    const out = await api<DropResult>(`/api/drop/${encodeURIComponent(f.name)}${q.size ? `?${q}` : ""}`, {
      method: "PUT",
      body,
      headers: { "content-type": "application/octet-stream" },
    });
    o.onProgress?.(1);
    return { url: out.share_url, link: out.link, label };
  }

  const plan = await api<UploadPlan>("/api/v1/links", {
    method: "POST",
    ...json({ files: files.map((f) => ({ name: f.name, size: f.size })) }),
  });
  const total = files.reduce((n, f) => n + f.size, 0) || 1;
  let sent = 0;
  for (const [i, up] of plan.uploads.entries()) {
    const file = files[i];
    const handle = await open(file.path, "r");
    const parts: { partNumber: number; etag: string }[] = [];
    try {
      for (let n = 1; n <= up.parts; n++) {
        const start = (n - 1) * up.partSize;
        const length = Math.min(up.partSize, file.size - start);
        const chunk = Buffer.alloc(Math.max(0, length));
        if (length > 0) await handle.read(chunk, 0, length, start);
        const part = await api<{ partNumber: number; etag: string }>(`/api/v1/files/${up.fileId}/parts/${n}`, {
          method: "PUT",
          body: chunk,
          headers: { "content-type": "application/octet-stream" },
        });
        parts.push({ partNumber: part.partNumber, etag: part.etag });
        sent += length;
        o.onProgress?.(sent / total);
      }
    } finally {
      await handle.close();
    }
    await api(`/api/v1/files/${up.fileId}/complete`, { method: "POST", ...json({ parts }) });
  }
  if (o.expiry) await api(`/api/v1/links/${plan.link.id}`, { method: "PATCH", ...json({ expiry: o.expiry }) });
  if (label) {
    const share = await createShare(plan.link.id, label);
    return { url: share.url, link: plan.link, label };
  }
  return { url: plan.link.url, link: plan.link };
}
