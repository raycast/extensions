type DataAPIResponse = {
  query?: {
    title?: string;
    tag?: string;
    type?: string;
    fileType?: string;
    ens?: string;
  };
  count: number;
  types: string[];
  fileTypes: string[];
  tags: string[];
  date: string;
  data: Item[];
};

type Item = {
  id: string;
  Source: string;
  Type: string;
  "Social Link": string;
  Filetype: string;
  ENS: string;
  Description: string;
  Thumbnails: ItemThumbnail[];
  Tags: string[];
  ID: number;
  Title: string;
  File: string;
};

type ItemThumbnail = {
  name: string;
  url: string;
  rawUrl: string;
};

type RandomItem = {
  image: Image;
  data: Item;
};

type Image = {
  url: string;
};

type CaseType = "camel" | "pascal" | "kebab" | "snake";
