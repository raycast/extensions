export type Category =
  | "AI & LLM Platforms"
  | "Developer Tools & IDEs"
  | "Backend, Database & DevOps"
  | "Productivity & SaaS"
  | "Design & Creative Tools"
  | "Fintech & Crypto"
  | "E-commerce & Retail"
  | "Media & Consumer Tech"
  | "Automotive"
  | "Other";

export type DesignSkill = {
  slug: string;
  name: string;
  category: Category;
  description: string;
  designMdUrl: string;
  siteUrl: string;
};

export const SITE_BASE_URL = "https://getdesign.md";

export function getRawDesignMdUrl(slug: string): string {
  return `${SITE_BASE_URL}/design-md/${slug}/DESIGN.md`;
}

export function getSiteUrl(slug: string): string {
  return `${SITE_BASE_URL}/${slug}/design-md`;
}
