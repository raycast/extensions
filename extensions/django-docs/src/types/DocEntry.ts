export interface DocEntry {
  url: string;
  title: string;
  content: string;
  headings: string[];
  parent: DocEntry | null;
  previous: DocEntry | null;
  next: DocEntry | null;
}
