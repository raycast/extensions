interface NYTTopResult {
  status: string;
  copyright: string;
  section: string;
  last_updated: string;
  num_results: number;
  results: ResultsItem[];
}
interface ResultsItem {
  section: string;
  subsection: string;
  title: string;
  abstract: string;
  url: string;
  uri: string;
  byline: string;
  item_type: string;
  updated_date: string;
  created_date: string;
  published_date: string;
  material_type_facet: string;
  kicker: string;
  des_facet: string[];
  org_facet: string[];
  per_facet: string[];
  geo_facet: string[];
  multimedia: MultimediaItem[] | null;
  short_url: string;
}
interface MultimediaItem {
  url: string;
  format: string;
  height: number;
  width: number;
  type: string;
  subtype: string;
  caption: string;
  copyright: string;
}

export type { NYTTopResult, ResultsItem, MultimediaItem };
