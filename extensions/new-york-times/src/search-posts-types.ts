interface NYTSearchResult {
  status: string;
  copyright: string;
  response: Response;
}
interface Response {
  docs: DocsItem[];
  meta: Meta;
}
interface DocsItem {
  abstract: string;
  web_url: string;
  snippet: string;
  lead_paragraph: string;
  print_section?: string;
  print_page?: string;
  source: string;
  multimedia: MultimediaItem[];
  headline: Headline;
  keywords: KeywordsItem[];
  pub_date: string;
  document_type: string;
  news_desk: string;
  section_name: string;
  subsection_name: string;
  byline: Byline;
  type_of_material: string;
  _id: string;
  word_count: number;
  uri: string;
}
interface MultimediaItem {
  rank: number;
  subtype: string;
  caption: null;
  credit: null;
  type: string;
  url: string;
  height: number;
  width: number;
  legacy: Legacy;
  subType: string;
  crop_name: string;
}
interface Legacy {
  xlarge?: string;
  xlargewidth?: number;
  xlargeheight?: number;
  thumbnail?: string;
  thumbnailwidth?: number;
  thumbnailheight?: number;
  widewidth?: number;
  wideheight?: number;
  wide?: string;
}
interface Headline {
  main: string;
  kicker: null;
  content_kicker: null;
  print_headline: string | null;
  name: null;
  seo: null;
  sub: null;
}
interface KeywordsItem {
  name: string;
  value: string;
  rank: number;
  major: string;
}
interface Byline {
  original: string | null;
  person: PersonItem[];
  organization: null;
}
interface PersonItem {
  firstname: string;
  middlename: null;
  lastname: string;
  qualifier: null;
  title: null;
  role: string;
  organization: string;
  rank: number;
}
interface Meta {
  hits: number;
  offset: number;
  time: number;
}

export type {
  NYTSearchResult,
  Response,
  DocsItem,
  MultimediaItem,
  Legacy,
  Headline,
  KeywordsItem,
  Byline,
  PersonItem,
  Meta,
};
