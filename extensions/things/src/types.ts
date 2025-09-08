export type Preferences = {
  thingsAppIdentifier: string;
  authToken?: string;
};

export type CommandListName = 'inbox' | 'today' | 'anytime' | 'upcoming' | 'someday' | 'logbook' | 'trash';

export type Todo = {
  id: string;
  name: string;
  status: 'open' | 'completed' | 'canceled';
  tags: string;
  project?: Project;
  area?: Area;
  dueDate: string;
  activationDate: string;
  notes: string;
  isProject?: boolean;
};

export type Project = {
  id: string;
  name: string;
  status: 'open' | 'completed' | 'canceled';
  tags: string;
  dueDate: string;
  activationDate: string;
  notes: string;
  area?: Area;
};

export type Area = {
  id: string;
  name: string;
};

export type List = { id: string; name: string; type: 'area' | 'project' };

export type AddTodoParams = {
  title?: string;
  titles?: string;
  notes?: string;
  when?: string;
  deadline?: string;
  tags?: string;
  'checklist-items'?: string;
  'use-clipboard'?: string;
  'list-id'?: string;
  list?: string;
  'heading-id'?: string;
  heading?: string;
  completed?: boolean;
  canceled?: boolean;
  'show-quick-entry'?: boolean;
  reveal?: boolean;
  'creation-date'?: string;
  'completion-date'?: string;
};

export type UpdateTodoParams = {
  title?: string;
  notes?: string;
  'prepend-notes'?: string;
  'append-notes'?: string;
  when?: string;
  deadline?: string;
  tags?: string;
  'add-tags'?: string;
  'checklist-items'?: string;
  'prepend-checklist-items'?: string;
  'append-checklist-items'?: string;
  'use-clipboard'?: string;
  'list-id'?: string;
  list?: string;
  'heading-id'?: string;
  heading?: string;
  completed?: boolean;
  canceled?: boolean;
  'show-quick-entry'?: boolean;
  reveal?: boolean;
  duplicate?: boolean;
  'creation-date'?: string;
  'completion-date'?: string;
};

export type AddProjectParams = {
  title?: string;
  notes?: string;
  when?: string;
  deadline?: string;
  tags?: string;
  'area-id'?: string;
  area?: string;
  'to-dos'?: string;
  completed?: boolean;
  canceled?: boolean;
  reveal?: boolean;
  'creation-date'?: string;
  'completion-date'?: string;
};

export type UpdateProjectParams = {
  title?: string;
  notes?: string;
  'prepend-notes'?: string;
  'append-notes'?: string;
  when?: string;
  deadline?: string;
  tags?: string;
  'add-tags'?: string;
  'area-id'?: string;
  area?: string;
  completed?: boolean;
  canceled?: boolean;
  reveal?: boolean;
  duplicate?: boolean;
  'creation-date'?: string;
  'completion-date'?: string;
};
