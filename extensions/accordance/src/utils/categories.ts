import { Icon } from "@raycast/api";

export interface ContentCategory {
  id: string;
  name: string;
  icon: Icon;
}

export const CONTENT_CATEGORIES: ContentCategory[] = [
  { id: "all", name: "All", icon: Icon.List },
  { id: "all-texts", name: "All Texts", icon: Icon.Book },
  { id: "all-tools", name: "All Tools", icon: Icon.WrenchScrewdriver },
  { id: "graphics-tools", name: "Graphics Tools", icon: Icon.Image },
  { id: "custom", name: "Custom", icon: Icon.Gear },
  { id: "dictionaries", name: "Dictionaries", icon: Icon.Bookmark },
  { id: "commentaries", name: "Commentaries", icon: Icon.SpeechBubbleActive },
  { id: "greek-lexicons", name: "Greek Lexicons", icon: Icon.Globe },
  { id: "hebrew-lexicons", name: "Hebrew Lexicons", icon: Icon.Text },
  { id: "grammars", name: "Grammars", icon: Icon.Text },
  { id: "visual", name: "Visual", icon: Icon.Image },
  { id: "devotionals", name: "Devotionals", icon: Icon.Heart },
  { id: "cross-references", name: "Cross-references", icon: Icon.Link },
  { id: "study-bibles", name: "Study Bibles", icon: Icon.Book },
  { id: "practical", name: "Practical", icon: Icon.CheckCircle },
  { id: "preaching", name: "Preaching", icon: Icon.Megaphone },
  { id: "theological", name: "Theological", icon: Icon.LightBulb },
  { id: "writings", name: "Writings", icon: Icon.Pencil },
  { id: "history", name: "History", icon: Icon.Clock },
  { id: "biblical-studies", name: "Biblical Studies", icon: Icon.Book },
  { id: "apparatus", name: "Apparatus", icon: Icon.WrenchScrewdriver },
  { id: "greek-studies", name: "Greek Studies", icon: Icon.Globe },
  { id: "semitic-studies", name: "Semitic Studies", icon: Icon.Star },
  { id: "translator-notes", name: "Translator Notes", icon: Icon.Info },
  { id: "other-books", name: "Other Books", icon: Icon.Eye },
  { id: "parallels", name: "Parallels", icon: Icon.List },
];

// Legacy exports for backward compatibility
export interface SearchScope extends ContentCategory {
  urlParameter: string;
}

export const SEARCH_SCOPES: SearchScope[] = CONTENT_CATEGORIES.map((category) => ({
  ...category,
  urlParameter: `[${category.name}]`,
}));
