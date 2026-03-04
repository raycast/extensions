import { Workspace } from "./storage";

export interface InstanceInfo {
  name: string;
  baseUrl: string;
}

export function parseInstancesFromMasterHtml(html: string): InstanceInfo[] {
  const instances: InstanceInfo[] = [];
  const seen = new Set<string>();

  const blocks = html.split(/<app-instance-display/i);

  for (const block of blocks) {
    const nameMatch = block.match(/<h1[^>]*><b[^>]*>([^<]+)<\/b><\/h1>/i);
    const urlMatch = block.match(/>\s*([a-z0-9][a-z0-9.-]+\.xano\.io)\s*</i);

    if (nameMatch && urlMatch) {
      const name = nameMatch[1].trim();
      const baseUrl = `https://${urlMatch[1].trim()}`;

      if (!seen.has(baseUrl)) {
        seen.add(baseUrl);
        instances.push({ name, baseUrl });
      }
    }
  }

  return instances;
}

export function parseWorkspacesFromHtml(html: string): Workspace[] {
  const workspaces: Workspace[] = [];
  const seen = new Set<string>();

  // Workspace cards use aria-label for the name and contain "Workspace ID: #XX"
  const cardRegex =
    /class="[^"]*workspace-card[^"]*"[^>]*aria-label="([^"]+)"[\s\S]*?Workspace ID:\s*#(\d+)/gi;
  let match;

  while ((match = cardRegex.exec(html)) !== null) {
    const name = match[1];
    const id = match[2];

    if (id && name && !seen.has(id)) {
      seen.add(id);
      workspaces.push({ id, name });
    }
  }

  return workspaces;
}

export function parseInstanceName(html: string): string {
  // Instance name is in <app-instance-display> → <h1><b>NAME</b></h1>
  const match = html.match(
    /<app-instance-display[^>]*>[\s\S]*?<h1[^>]*><b[^>]*>([^<]+)<\/b><\/h1>/i,
  );
  return match?.[1]?.trim() ?? "Unknown Instance";
}

export function parseWorkspaceNameFromPage(html: string): string | null {
  const match = html.match(
    /<app-page-header-title[^>]*>([\s\S]*?)<\/app-page-header-title>/i,
  );
  if (!match) return null;
  // Strip HTML comments and tags, then trim
  const cleaned = match[1]
    .replace(/<!--.*?-->/g, "")
    .replace(/<[^>]*>/g, "")
    .trim();
  return cleaned || null;
}

export function parseWorkspaceIdFromUrl(url: string): string | null {
  const match = url.match(/\/workspace\/(\d+)/);
  return match?.[1] ?? null;
}

export function extractBaseUrl(url: string): string {
  const parsed = new URL(url);
  return `${parsed.protocol}//${parsed.host}`;
}
