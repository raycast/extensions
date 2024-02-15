type WithTimestamps = {
  updatedAt: string | Date;
  createdAt: string | Date;
};

export const convertNotesTimeStamps = <T extends WithTimestamps>(note: T) => {
  return {
    ...note,
    updatedAt: new Date(note.updatedAt),
    createdAt: new Date(note.createdAt),
  };
};
