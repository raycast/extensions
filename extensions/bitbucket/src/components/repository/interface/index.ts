export interface Repository {
  uuid: string;
  name: string;
  slug: string;
  description: string;
  avatarUrl: string;
  fullName: string;
  url: string;
}

export interface Patch {
  text?: string;
  tags?: string[];
  timee?: number;
  timeEnd?: number;
}