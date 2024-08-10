export interface TrackEntry {
  startTime: number;
  endTime: number | null;
}

export interface Topic {
  name: string;
  createdAt: number;
}

export interface Title {
  id: string;
  name: string;
}
