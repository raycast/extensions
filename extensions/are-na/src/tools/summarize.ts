import type { Block, Channel, User } from "../api/types";

export function channelSummary(c: Channel) {
  return {
    id: c.id,
    title: c.title,
    slug: c.slug,
    owner_slug: c.owner_slug,
    status: c.status,
    block_count: c.length,
    url: `https://www.are.na/${c.owner_slug}/${c.slug}`,
  };
}

export function userSummary(u: User) {
  return {
    id: u.id,
    slug: u.slug,
    full_name: u.full_name,
    username: u.username ?? u.slug,
    channel_count: u.channel_count,
    url: `https://www.are.na/${u.slug}`,
  };
}

export function blockSummary(b: Block) {
  const url = `https://www.are.na/block/${b.id}`;
  let preview = b.content ?? b.description ?? "";
  if (preview.length > 500) {
    preview = `${preview.slice(0, 500)}…`;
  }
  return {
    id: b.id,
    class: b.class,
    title: b.title ?? b.generated_title,
    preview: preview || null,
    source_url: b.source?.url ?? null,
    url,
  };
}

function clip(text: string | null, max: number): string | null {
  if (text == null || text === "") return null;
  if (text.length <= max) return text;
  return `${text.slice(0, max)}…`;
}

export function blockDetail(b: Block) {
  const url = `https://www.are.na/block/${b.id}`;
  return {
    id: b.id,
    class: b.class,
    title: b.title ?? b.generated_title,
    content: clip(b.content, 4000),
    description: clip(b.description, 2000),
    source_url: b.source?.url ?? null,
    visibility: b.visibility,
    url,
    author: userSummary(b.user),
    attachment: b.attachment
      ? {
          file_name: b.attachment.file_name,
          url: b.attachment.url,
        }
      : null,
  };
}
