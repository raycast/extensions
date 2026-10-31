export interface MetadataTag {
  name: string;
  content: string;
}

export interface SocialImage {
  source: "og" | "twitter";
  url: string;
  resolvedUrl?: string;
  width?: number;
  height?: number;
  alt?: string;
}

export interface OpenGraph {
  title?: string;
  description?: string;
  tags: MetadataTag[];
  images: SocialImage[];
}
