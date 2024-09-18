type Author = {
  id: string;
  username: string;
  d7Users: number;
  d7Plays: number;
  tasks: Array<Task>;
};

type Task = {
  id: string;
  name: string;
  imageUrl: string;
  description: string;
};

export type { Author, Task };
