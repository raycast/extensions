export type InspireAuthor = {
  full_name: string;
};

export type InspireCollaboration = {
  value: string;
};

export type InspireExternalIdentifier = {
  schema: string;
  value: string;
};

export type InspireMetadata = {
  titles: Array<{ title: string }>;
  collaborations?: InspireCollaboration[];
  authors?: InspireAuthor[];
  earliest_date: string;
  citation_count: number;
  arxiv_eprints?: Array<{ value: string }>;
  publication_info?: Array<{ journal_title?: string }>;
  number_of_pages?: number;
  abstracts?: Array<{ value: string }>;
  keywords?: Array<{ value: string }>;
  document_type: string[];
  dois?: Array<{ value: string }>;
  imprints?: Array<{ publisher?: string }>;
  external_system_identifiers?: InspireExternalIdentifier[];
};

export type InspireItem = {
  id: number;
  created: string;
  links: {
    bibtex: string;
  };
  metadata: InspireMetadata;
};

export type InspireResponse = {
  hits: {
    total: number;
    hits: InspireItem[];
  };
};
