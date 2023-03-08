export interface NoteItem {
  id: string;
  title: string;
  modifiedAt?: Date;
  folder: string;
  snippet: string;
  account: string;
}
