export type NoteInfo = {
  noteId: number;
  tags: string[];
  fields: {
    Front: {
      value: string;
      order: number;
    };
    Back: {
      value: string;
      order: number;
    };
  };
  modelName: string;
  cards: number[];
};
