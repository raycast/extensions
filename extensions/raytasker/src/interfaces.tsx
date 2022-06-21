
export interface TaskLists {
  kind: string;
  etag: string;
  nextPageToken: string;
  items: TaskList[];
}

export interface TaskList {
  kind: string;
  id: string;
  etag: string;
  title: string;
  updated: string;
  selfLink: string;
}

export interface TasksList {
  kind: string;
  etag: string;
  nextPageToken?: string;
  items: Task[];
}

export interface Task {
  list: string;
  kind: string;
  id: string;
  etag: string;
  title: string;
  updated: string;
  selfLink: string;
  parent: string;
  position: string;
  notes: string;
  status: string;
  due: string;
  completed: string;
  deleted: boolean;
  hidden: boolean;
  links: {
    type: string;
    description: string;
    link: string;
  }[];
}

export interface DDProps {
  lists: TaskList[];
  chosenList: string;
  filterTasks: (id: string) => void;
  chooseList: (id: string) => void
}

export interface FormProps {
  lists: TaskList[];
  task?: Task;
  index: number;
  currentList: string;
  filterTasks: (id: string) => void;
  isLoading: (loading: boolean) => void;
  addTask: (task: Task) => void;
  editTask: (task: Task, index: number) => void;
  createNew: boolean;
}