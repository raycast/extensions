export type Data = {
  tags: Record<UUID, Tag>;
  tasks: Record<UUID, Task>;
  groups: Record<UUID, Group>;
  nodes: Node[];
};

export type UUID = string;

export type Timestamp = number;

export const TimColor = {
  Red: "#EF534F",
  Pink: "#FB5DB0",
  Purple: "#AB47BC",
  Indigo: "#6A72D9",
  Blue: "#41A5F5",
  Cyan: "#26C5DA",
  Teal: "#2BD4BF",
  Green: "#42D978",
  Yellow: "#FDE047",
  Orange: "#FFA92A",
};

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
  rate?: number;
};

export type Node = {
  id: UUID;
  parent?: UUID | "ARCHIVE";
};

export type Task = {
  id: UUID;
  title: string;
  updatedAt: Timestamp;
  tags: UUID[] | null;
  createdAt: Timestamp;
  records: TaskRecord[];
  rate?: number;
  color: keyof typeof TimColor;
};

export type TaskRecord = {
  start: Timestamp;
  end: Timestamp;
  note?: string;
};
