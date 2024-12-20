export interface DockItem {
  id: number;
  title: string;
  name: string;
  enabled: boolean;
  position?: number;
  url: string;
  app_url: string;
}

export type BasecampProject = {
  id: number;
  status: string;
  created_at: string;
  updated_at: string;
  name: string;
  description: string;
  purpose: string;
  clients_enabled: boolean;
  bookmark_url: string;
  url: string;
  app_url: string;
  dock: DockItem[];
  bookmarked: boolean;
  client_company?: {
    id: number;
    name: string;
  };
  clientside?: {
    url: string;
    app_url: string;
  };
};

export interface TodoList {
  id: number;
  title: string;
  description: string;
  created_at: string;
  updated_at: string;
  url: string;
  app_url: string;
  completed_ratio: string;
}

export interface TodoParent {
  id: number;
  title: string;
  type: string;
  url: string;
  app_url: string;
}

export interface TodoBucket {
  id: number;
  name: string;
  type: string;
}

export interface TodoCreatorCompany {
  id: number;
  name: string;
}

export interface TodoCreator {
  id: number;
  attachable_sgid: string;
  name: string;
  email_address: string;
  personable_type: string;
  title: string;
  bio: string | null;
  location: string | null;
  created_at: string;
  updated_at: string;
  admin: boolean;
  owner: boolean;
  client: boolean;
  employee: boolean;
  time_zone: string;
  avatar_url: string;
  company: TodoCreatorCompany;
  can_manage_projects: boolean;
  can_manage_people: boolean;
}

export interface BasecampTodo {
  id: number;
  status: string;
  visible_to_clients: boolean;
  created_at: string;
  updated_at: string;
  title: string;
  inherits_status: boolean;
  type: string;
  url: string;
  app_url: string;
  bookmark_url: string;
  subscription_url: string;
  comments_count: number;
  comments_url: string;
  position: number;
  parent: TodoParent;
  bucket: TodoBucket;
  creator: TodoCreator;
  description: string;
  completed: boolean;
  content: string;
  starts_on: string | null;
  due_on: string | null;
  assignees: TodoCreator[];
  completion_subscribers: TodoCreator[];
  completion_url: string;
}

export interface BasecampComment {
  id: number;
  status: string;
  visible_to_clients: boolean;
  created_at: string;
  updated_at: string;
  title: string;
  inherits_status: boolean;
  type: "Comment";
  url: string;
  app_url: string;
  bookmark_url: string;
  parent: {
    id: number;
    title: string;
    type: string;
    url: string;
    app_url: string;
  };
  bucket: {
    id: number;
    name: string;
    type: string;
  };
  creator: TodoCreator;
  content: string;
}

// Add a utility function to strip HTML tags
export function stripHtml(html: string): string {
  return html?.replace(/<[^>]*>/g, "") || "";
}

// Add HTML to Markdown converter function
export function htmlToMarkdown(html: string): string {
  if (!html) return "";

  const markdown = html
    // Replace break tags with newlines
    .replace(/<br\s*\/?>/gi, "\n")
    // Replace paragraph tags
    .replace(/<p.*?>/gi, "")
    .replace(/<\/p>/gi, "\n\n")
    // Convert strong/b to bold
    .replace(/<(strong|b)>/gi, "**")
    .replace(/<\/(strong|b)>/gi, "**")
    // Convert em/i to italic
    .replace(/<(em|i)>/gi, "_")
    .replace(/<\/(em|i)>/gi, "_")
    // Convert links
    .replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi, "[$2]($1)")
    // Convert lists
    .replace(/<ul>/gi, "\n")
    .replace(/<\/ul>/gi, "\n")
    .replace(/<li>/gi, "- ")
    .replace(/<\/li>/gi, "\n")
    // Remove any other HTML tags
    .replace(/<[^>]*>/g, "")
    // Decode HTML entities
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    // Clean up extra whitespace
    .replace(/\n\s*\n\s*\n/g, "\n\n")
    .trim();

  return markdown;
}

export interface BasecampPerson {
  id: number;
  attachable_sgid: string;
  name: string;
  email_address: string;
  personable_type: string;
  title: string;
  bio: string;
  location: string;
  created_at: string;
  updated_at: string;
  admin: boolean;
  owner: boolean;
  client: boolean;
  employee: boolean;
  time_zone: string;
  avatar_url: string;
  company: Company;
  can_manage_projects: boolean;
  can_manage_people: boolean;
}
interface Company {
  id: number;
  name: string;
}
