export interface Category {
  key: string;
  name: string;
  description: string;
  emoji: string;
}

export interface Collaborator {
  username: string;
  url: string;
}

export interface Repository {
  name: string;
  url: string;
  "current-maintainers": string[];
  "past-maintainers": string[];
}

export interface Link {
  name: string;
  url: string;
  color?: string;
  icon?: string;
}

export interface Port {
  identifier: string;
  name: string;
  categories: string[];
  platform: string[];
  color: string;
  key: string;
  repository: Repository;
  icon?: string;
  upstreamed?: boolean;
  links?: Link[];
  "is-archived"?: boolean;
}

export interface ArchivedPort extends Omit<Port, "upstreamed" | "links"> {
  reason: string;
}

export interface Showcase {
  title: string;
  description: string;
  link: string;
}

export interface UserstyleWebsiteSupport {
  name: string;
  link: string;
}

export interface Userstyle {
  name: string;
  link: string;
  categories: string[];
  color: string;
  "current-maintainers": string[];
  icon?: string;
  note?: string;
  supports?: Record<string, UserstyleWebsiteSupport>;
  "past-maintainers"?: string[];
  key?: string;
  "is-userstyle"?: boolean;
}

export interface PortsResponse {
  ports: Port[];
  collaborators: Collaborator[];
  categories: Category[];
  showcases: Showcase[];
  "archived-ports": ArchivedPort[];
}

export interface UserstylesResponse {
  userstyles: Record<string, Userstyle>;
  collaborators: string[];
}
