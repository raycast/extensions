export interface VODModel {
  total: number;
  limit: number;
  skip: number;
  data: SingleVod[];
}

export interface SingleVod {
  id: string;
  chapters: Chapter[];
  title: string;
  duration: string;
  date: string;
  thumbnail_url: string;
  youtube: Youtube[];
  stream_id: string;
  drive: Drive[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Chapter {
  gameId: string;
  name: string;
  image: string;
  duration: string;
  start: number;
  end: number;
}

export interface Drive {
  id: string;
  type: string;
}

export interface Youtube {
  id: string;
  type: string;
  duration: number;
  part: number;
  thumbnail_url: string;
}
