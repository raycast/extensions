export interface Song {
  title: string;
  url: string;
  artist: string;
  difficulty?: string;
}

export interface CommandState {
  records?: Array<Song>;
  error?: Error;
  loading?: boolean;
}
