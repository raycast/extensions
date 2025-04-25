import { unfurl } from "unfurl.js";

export interface Metadata {
  title: string;
  description: string;
  image: string;
  favicon: string;
}

export async function getMetadata(url: string): Promise<Metadata> {
  const result = await unfurl(url);
  return {
    title: result.title || url,
    description: result.description || "",
    image: result.open_graph?.images?.[0]?.url || "",
    favicon: result.favicon || "",
  };
}
