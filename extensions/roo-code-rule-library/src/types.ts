export interface Rule {
  title: string;
  ruleIdentifier: string;
  modeSlug?: string;
  content: string;
  comment?: string;
  isPinned?: boolean;
  tags?: string[];
}

export interface CustomMode {
  slug: string;
  name: string;
}

export interface Tag {
  name: string;
}
