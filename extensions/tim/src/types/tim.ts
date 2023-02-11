export type TimExport = {
  tags: Record<UUID, Tag>;
  tasks: Record<UUID, Task>;
  groups: Record<UUID, Group>;
  nodes: Node[];
};

export type UUID = string;

export type Timestamp = number;

export type HexColor = string;

export type Tag = {
  id: UUID;
  title: string;
  updatedAt: Timestamp;
  createdAt: Timestamp;
  color: HexColor;
};

export type Group = {
  id: UUID;
  title: string;
  updatedAt: Timestamp;
  createdAt: Timestamp;
};

export type Node = {
  id: UUID;
  parent?: UUID;
};

export type Task = {
  id: UUID;
  title: string;
  updatedAt: Timestamp;
  tags: UUID[];
  createdAt: Timestamp;
  records: TaskRecord[];
  rate?: number;
};

export type TaskRecord = {
  start: Timestamp;
  end: Timestamp;
};
