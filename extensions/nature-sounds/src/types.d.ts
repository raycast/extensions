export interface Audios {
  [key: string]: {
    filename: string;
    name: string;
    icon: string;
    subtitle?: string;
  };
}

export interface Audio {
  filename: string;
  name: string;
  icon: string;
  subtitle?: string;
}

export interface Item {
  name: string;
  pid: number;
}

export interface PlayingItem {
  playing?: Item[];
  setPlaying: React.Dispatch<React.SetStateAction<Item[]>>;
}
