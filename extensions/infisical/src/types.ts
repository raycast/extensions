export interface Workspace {
  id: string;
  name: string;
  slug: string;
  organization: string;
  environments: Array<{ name: string; slug: string }>;
}
