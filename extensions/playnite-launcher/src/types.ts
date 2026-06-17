interface PlayniteGameSource {
  Id: string;
  Name: string;
}

interface PlayniteGameReleaseDate {
  Date: string;
  Day: number;
  Month: number;
  Year: number;
}

export interface PlayniteGame {
  Id: string;
  Name: string;
  Icon?: string | null;
  InstallDirectory?: string | null;
  IsInstalled: boolean;
  Source: PlayniteGameSource;
  ReleaseDate?: PlayniteGameReleaseDate;
  Playtime: number;
  Hidden: boolean;
}
