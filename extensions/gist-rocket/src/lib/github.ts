import { OAuthService, getAccessToken, withAccessToken } from "@raycast/utils";
import { Octokit } from "@octokit/rest";

export const github = OAuthService.github({
  scope: "gist",
});

export function withGitHub<T>(Component: React.ComponentType<T>) {
  return withAccessToken(github)(Component);
}

export function octokit(): Octokit {
  const { token } = getAccessToken();
  return new Octokit({ auth: token });
}

export type GistVisibility = "public" | "secret";

export type GistFileInput = { filename: string; content: string };

export async function createPage(opts: {
  description: string;
  visibility: GistVisibility;
  files: GistFileInput[];
}): Promise<{ id: string; htmlUrl: string }> {
  const filesPayload: Record<string, { content: string }> = {};
  for (const f of opts.files) filesPayload[f.filename] = { content: f.content };
  const { data } = await octokit().gists.create({
    description: opts.description,
    public: opts.visibility === "public",
    files: filesPayload,
  });
  if (!data.id) throw new Error("GitHub returned a gist without an id");
  return { id: data.id, htmlUrl: data.html_url ?? "" };
}

export async function updatePage(opts: {
  id: string;
  description?: string;
  files: GistFileInput[];
  /** Files to delete from the gist (set to null in the API payload). */
  removeFiles?: string[];
}): Promise<void> {
  const filesPayload: Record<string, { content: string } | null> = {};
  for (const f of opts.files) filesPayload[f.filename] = { content: f.content };
  for (const name of opts.removeFiles ?? []) filesPayload[name] = null;
  await octokit().gists.update({
    gist_id: opts.id,
    description: opts.description,
    // @ts-expect-error octokit types disallow null but the API requires it for deletion
    files: filesPayload,
  });
}

export async function deletePage(id: string): Promise<void> {
  await octokit().gists.delete({ gist_id: id });
}

export type GistSummary = {
  id: string;
  description: string;
  isPublic: boolean;
  updatedAt: string;
  createdAt: string;
  files: { filename: string; type: string | null; size: number }[];
  hasIndex: boolean;
  hasSourceMarkdown: boolean;
};

export async function listMyPages(): Promise<GistSummary[]> {
  const all: GistSummary[] = [];
  for (let page = 1; page <= 50; page++) {
    const { data } = await octokit().gists.list({ per_page: 100, page });
    if (data.length === 0) break;
    for (const g of data) {
      const files = Object.values(g.files ?? {}).map((f) => ({
        filename: f?.filename ?? "",
        type: f?.type ?? null,
        size: f?.size ?? 0,
      }));
      const hasIndex = files.some((f) => f.filename.toLowerCase() === "index.html");
      const hasSourceMarkdown = files.some((f) => /^source\.(md|markdown)$/i.test(f.filename));
      if (!hasIndex) continue;
      all.push({
        id: g.id,
        description: g.description ?? "",
        isPublic: g.public,
        updatedAt: g.updated_at,
        createdAt: g.created_at,
        files,
        hasIndex,
        hasSourceMarkdown,
      });
    }
    if (data.length < 100) break;
  }
  return all;
}

export async function getGistFile(id: string, filename: string): Promise<string | null> {
  const { data } = await octokit().gists.get({ gist_id: id });
  const f = data.files?.[filename];
  if (!f) return null;
  if (typeof f.content === "string") return f.content;
  if (f.raw_url) {
    const r = await fetch(f.raw_url);
    if (!r.ok) throw new Error(`Failed to fetch ${filename}: ${r.status}`);
    return await r.text();
  }
  return null;
}
