import { LocalStorage } from "@raycast/api";
import { Credentials, Template, TemplateKind } from "./types";

const KEYS = {
  accessToken: "access_token",
  adAccountId: "ad_account_id",
  pageId: "page_id",
  metaCliPath: "meta_cli_path",
  templates: "templates",
} as const;

function normalizeAdAccountId(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  return trimmed.startsWith("act_") ? trimmed : `act_${trimmed}`;
}

export async function getCredentials(): Promise<Credentials | null> {
  const accessToken = ((await LocalStorage.getItem<string>(KEYS.accessToken)) ?? "").trim();
  const adAccountId = normalizeAdAccountId((await LocalStorage.getItem<string>(KEYS.adAccountId)) ?? "");
  const pageId = ((await LocalStorage.getItem<string>(KEYS.pageId)) ?? "").trim();
  const metaCliPath = ((await LocalStorage.getItem<string>(KEYS.metaCliPath)) ?? "").trim();

  if (!accessToken && !adAccountId && !pageId && !metaCliPath) {
    return null;
  }

  return {
    accessToken,
    adAccountId,
    pageId: pageId || undefined,
    metaCliPath: metaCliPath || undefined,
  };
}

export async function saveCredentials(credentials: Credentials): Promise<void> {
  await LocalStorage.setItem(KEYS.accessToken, credentials.accessToken.trim());
  await LocalStorage.setItem(KEYS.adAccountId, normalizeAdAccountId(credentials.adAccountId));
  if (credentials.pageId?.trim()) {
    await LocalStorage.setItem(KEYS.pageId, credentials.pageId.trim());
  } else {
    await LocalStorage.removeItem(KEYS.pageId);
  }
  if (credentials.metaCliPath?.trim()) {
    await LocalStorage.setItem(KEYS.metaCliPath, credentials.metaCliPath.trim());
  } else {
    await LocalStorage.removeItem(KEYS.metaCliPath);
  }
}

export function hasRequiredCredentials(credentials: Credentials | null): boolean {
  return Boolean(credentials?.accessToken && credentials?.adAccountId);
}

export async function getTemplates(): Promise<Template[]> {
  const raw = await LocalStorage.getItem<string>(KEYS.templates);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as Template[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function getTemplatesByKind(kind: TemplateKind): Promise<Template[]> {
  const templates = await getTemplates();
  return templates.filter((template) => template.kind === kind);
}

export async function saveTemplates(templates: Template[]): Promise<void> {
  await LocalStorage.setItem(KEYS.templates, JSON.stringify(templates));
}

export async function upsertTemplate(template: Template): Promise<void> {
  const templates = await getTemplates();
  const index = templates.findIndex((item) => item.id === template.id);
  if (index >= 0) {
    templates[index] = template;
  } else {
    templates.push(template);
  }
  await saveTemplates(templates);
}

export async function deleteTemplate(id: string): Promise<void> {
  const templates = await getTemplates();
  await saveTemplates(templates.filter((template) => template.id !== id));
}

export function maskToken(token: string): string {
  if (token.length <= 8) return "••••";
  return `${token.slice(0, 4)}••••${token.slice(-4)}`;
}
