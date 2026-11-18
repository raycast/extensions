export interface TipDraft {
  title: string;
  description: string;
  name: string | undefined;
}

export function buildTipMailto({ title, description, name }: TipDraft): string {
  const subject = `Tip for Caschys Blog: ${title}`;
  const body = `Title: ${title}\n\nDescription: ${description}\n\nSubmitted by: ${name?.trim() || "Anonymous"}`;

  return `mailto:tipp@stadt-bremerhaven.de?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
