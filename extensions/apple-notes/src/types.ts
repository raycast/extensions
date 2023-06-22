export interface NoteItem {
  id: string;
  UUID: string;
  title: string;
  modifiedAt?: Date;
  folder: string;
  snippet: string;
  account: string;
}
