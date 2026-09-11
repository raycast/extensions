export interface BookRow {
  id: number;
  title: string;
  pubdate: string | null;
  series_index: number;
  path: string;
  has_cover: number;
  authors: string | null;
  publisher: string | null;
  series: string | null;
  comments: string | null;
  format_data: string | null;
}

export interface FormatEntry {
  format: string;
  name: string;
}

export interface Book {
  id: number;
  title: string;
  author: string;
  year: number | null;
  publisher: string | null;
  series: string | null;
  seriesIndex: number | null;
  formats: FormatEntry[];
  comments: string | null;
  coverPath: string | null;
  bookFolderPath: string;
}
