const API_BASE = "https://mdshare.live";

export interface MdshareResult {
  documentId: string;
  /** Safe-to-share view-only URL */
  viewUrl: string;
  /** Keep private — full admin access */
  adminUrl: string;
  expiresAt?: string;
}

interface CreateDocumentResponse {
  document_id: string;
  admin_key: string;
  admin_url: string;
  expires_at?: string;
}

interface CreateLinkResponse {
  token: string;
  url: string;
  permission: string;
}

async function postMarkdown(markdown: string): Promise<CreateDocumentResponse> {
  const response = await fetch(`${API_BASE}/api/documents`, {
    method: "POST",
    headers: { "Content-Type": "text/markdown" },
    body: markdown,
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(body || `mdshare error ${response.status}`);
  }

  return (await response.json()) as CreateDocumentResponse;
}

async function createViewLink(documentId: string, adminKey: string): Promise<string> {
  const response = await fetch(`${API_BASE}/api/d/${documentId}/links?key=${encodeURIComponent(adminKey)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ permission: "view", label: "raycast-share" }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(body || `Unable to create a view-only link (${response.status})`);
  }

  const data = (await response.json()) as CreateLinkResponse;
  if (data.permission !== "view" || !data.url.startsWith(`${API_BASE}/`)) {
    throw new Error("mdshare returned an invalid view-only link");
  }
  return data.url;
}

/**
 * Upload markdown to mdshare (no login) and return a view-only share URL.
 * Content is public to anyone with the link. Do not share secrets.
 */
export async function shareToMdshare(markdown: string): Promise<MdshareResult> {
  const content = markdown.trim();
  if (!content) {
    throw new Error("Nothing to share");
  }

  const created = await postMarkdown(content);
  const viewUrl = await createViewLink(created.document_id, created.admin_key);

  return {
    documentId: created.document_id,
    viewUrl,
    adminUrl: created.admin_url,
    expiresAt: created.expires_at,
  };
}
