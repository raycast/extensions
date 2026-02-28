export interface IAdsGeneralQueryEntry {
  bibcode: string;
  title?: string[];
  author?: string[];
  year?: string;
  pub?: string;
  doi?: string[];
}

export interface IEntry {
  title: string;
  authors: string[];
  year: number;
  bibtex: string;
  journal?: string;
  abstract?: string;
  file?: string;
  url?: string;
}

export interface IEntryDetails extends IEntry {
  bibcode?: string;
}

export interface IRemoteEntryDetails extends IEntry {
  bibcode: string;
}

export interface ILocalEntry extends IEntry {
  type: "paper" | "book" | "thesis" | "misc";
}

export interface IAdsDocEntry {
  title?: string[];
  author?: string[];
  year?: string;
  pub?: string;
  abstract?: string;
  doi?: string[];
}
