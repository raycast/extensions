interface Tag {
  name: string;
  slug: string;
}

export interface Job {
  id: number;
  organization: string;
  title: string;
  location: string;
  type: string;
  url: string;
  salary?: string;
  published_at: string;
  tags: Array<Tag>;
}
