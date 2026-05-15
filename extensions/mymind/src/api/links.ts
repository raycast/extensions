import { api } from "./client";
import { Link, LinkSchema, unwrapList } from "./schemas";

export interface ListLinksOptions {
  objectId?: string;
  signal?: AbortSignal;
}

export async function listLinks(opts: ListLinksOptions = {}): Promise<Link[]> {
  const data = await api.get<unknown>("/links", {
    query: { objectId: opts.objectId },
    signal: opts.signal,
  });
  const all = unwrapList(LinkSchema, data, ["links", "items"]);
  if (!opts.objectId) return all;
  return all.filter((l) => l.source.id === opts.objectId || l.target.id === opts.objectId);
}

export async function createLink(sourceId: string, targetId: string): Promise<Link> {
  const data = await api.post<unknown>("/links", {
    source: { id: sourceId },
    target: { id: targetId },
  });
  return LinkSchema.parse(data);
}

export async function deleteLink(linkId: string): Promise<void> {
  await api.delete(`/links/${encodeURIComponent(linkId)}`);
}

export function linkPeerId(link: Link, fromObjectId: string): string | null {
  if (link.source.id === fromObjectId) return link.target.id;
  if (link.target.id === fromObjectId) return link.source.id;
  return null;
}

export function isManualLink(link: Link): boolean {
  if (!link.kind) return true;
  return /manual/i.test(link.kind);
}
