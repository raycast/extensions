export interface Pref {
  projectAPIID: string;
  eventAPIID: string;
  linkAPIID: string;
  keystoneAPIID: string;
  timerAPIID: string;
  journalAPIID: string;
  todoAPIID: string;
}

export interface ProjectGP {
  project: Project;
  nextKeystone: Keystone | null;
  lastJournal: Journal | null;
  todosRatio: string;
}

export interface Project {
  name: string;
  id: string;
  active: boolean;
  icon: string;
  subsProject: SubProject[];
  url: string;
  links: Link[];
  todosRatio: string;
  times: number;
}

export interface InternProject {
  name: string;
  icon: string;
  id: string;
  active: boolean;
}

export interface Journal {
  id: string;
  date: string;
  text: string;
  project: InternProject;
  todos: Todo[];
  name: string;
  times: number;
}

export interface Keystone {
  id: string;
  name: string;
  date: string;
  project: InternProject;
  todos: Todo[];
}

export interface Evnt {
  id: string;
  name: string;
  start: string;
  end: string;
  project: InternProject;
}

export interface Todo {
  id: string;
  name: string;
  checkbox: boolean;
  project: InternProject;
  keystone: Keystone;
}

export interface Link {
  id: string;
  name: string;
  url: string;
  icon: string;
  app: string;
  project: InternProject;
}

export interface SubProject {
  parentID: string;
  name: string;
  url: string;
  project: InternProject;
  icon: string;
}

export interface Timer {
  id: string;
  project: InternProject;
  start: string;
  end: string;
  running: boolean;
}

export interface CalItem {
  id: string;
  name: string;
  dateInfos: string;
  startDate: string;
  project: InternProject;
  type: string;
  todos: Todo[];
  days: string[];
}

export interface CalSection {
  name: string;
  items: CalItem[];
  order: number;
  type: string;
}

export interface TimeItem {
  startDate: string;
  item: Journal | Evnt | Keystone;
}
