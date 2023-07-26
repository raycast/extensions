export type NotionPropertiesResponse = Record<
  string,
  {
    id: string;
    title?: { plain_text: string }[];
    multi_select?: { name: string }[];
    select?: { name: string };
    rollup?: { array: { date: { start: string } }[] };
    url?: string;
    relation?: { id: string }[];
    created_time?: string;
  }
>;

export type NotionIcon = {
  file?: { url: string };
  external?: { url: string };
};
