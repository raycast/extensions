import { Category } from "../types";

const categoryKeywords: Record<Category, string[]> = {
  [Category.All]: [],
  [Category.Development]: [
    "code",
    "coder",
    "dev",
    "developer",
    "programming",
    "software",
    "debug",
    "api",
    "function",
    "algorithm",
    "script",
    "app",
    "application",
    "technical",
    "engineer",
    "backend",
    "frontend",
    "database",
    "git",
    "terminal",
    "cli",
    "framework",
  ],
  [Category.Marketing]: [
    "seo",
    "marketing",
    "campaign",
    "ads",
    "content marketing",
    "social media",
    "branding",
    "promotion",
    "advertising",
    "conversion",
    "analytics",
    "traffic",
    "engagement",
    "audience",
    "strategy",
    "funnel",
  ],
  [Category.Writing]: [
    "email",
    "write",
    "writer",
    "content",
    "blog",
    "article",
    "copy",
    "copywriting",
    "draft",
    "editor",
    "proofread",
    "grammar",
    "story",
    "narrative",
    "essay",
    "document",
  ],
  [Category.Research]: [
    "research",
    "market research",
    "analysis",
    "analyze",
    "study",
    "data",
    "statistics",
    "survey",
    "findings",
    "report",
    "investigation",
    "academic",
    "paper",
    "journal",
    "review",
    "collector",
    "news",
  ],
  [Category.Design]: [
    "design",
    "ui",
    "ux",
    "website",
    "web",
    "interface",
    "visual",
    "layout",
    "mockup",
    "wireframe",
    "prototype",
    "creative",
    "graphic",
    "branding",
    "logo",
    "builder",
  ],
  [Category.Business]: [
    "meeting",
    "business",
    "company",
    "corporate",
    "management",
    "strategy",
    "planning",
    "presentation",
    "proposal",
    "pitch",
    "sales",
    "client",
    "stakeholder",
    "executive",
    "notes",
    "assistant",
  ],
  [Category.General]: [],
};

export function categorizePrompt(name: string, prompt: string): Category {
  const nameLower = name.toLowerCase();
  const searchText = `${name} ${prompt}`.toLowerCase();

  // Check each category (except All and General)
  const categories = [
    Category.Research, // Check Research first for priority
    Category.Development,
    Category.Marketing,
    Category.Writing,
    Category.Design,
    Category.Business,
  ];

  // First pass: Check if keywords are in the name/title (higher priority)
  for (const category of categories) {
    const keywords = categoryKeywords[category];
    for (const keyword of keywords) {
      if (nameLower.includes(keyword.toLowerCase())) {
        return category;
      }
    }
  }

  // Second pass: Check full content if no match in name
  for (const category of categories) {
    const keywords = categoryKeywords[category];
    for (const keyword of keywords) {
      if (searchText.includes(keyword.toLowerCase())) {
        return category;
      }
    }
  }

  // Default to General if no category matches
  return Category.General;
}
