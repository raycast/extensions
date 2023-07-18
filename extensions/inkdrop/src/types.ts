export interface Note {
  doctype: string;
  bookId: string;
  createdAt: number;
  updatedAt: number;
  status: string;
  share: string;
  numOfTasks: number;
  numOfCheckedTasks: number;
  pinned: boolean;
  title: string;
  body: string;
  tags: string[];
  _id: string;
  _rev: string;
}

export interface Notebook {
  parentBookId: string;
  updatedAt: number;
  createdAt: number;
  name: string;
  _id: string;
  _rev: string;
}
