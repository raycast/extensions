export interface Record {
  id: string;
  name: string;
  username?: string;
  email?: string;
  password: string;
  url?: string;
  notes?: string;
}

export type RecordData = Omit<Record, "id">;

export type RevalidateRecords = () => Promise<{
  document: {
    name: string;
    location: string;
  };
  records: Record[];
}>;
