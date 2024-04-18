export type Note = {
  id: string;
  userId: string;
  description: string;
  createdAt: Date;
  updatedAt: Date;
};

export type NoteContent = {
  id: string;
  content: object[];
  description: string;
};

export type NoteWithContent = Note & NoteContent;
