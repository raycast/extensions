export interface JacredParsedTorrent {
  tracker: string;
  url: string;
  createTime: string;
  magnet: string;
  name: string;
  originalname: string;
  size: number;
  sizeName: string;
  title: string;
  sid: number;
  pir: number;
  quality: string;
  released: number;
  videotype: string;
  voices: string[];
  types: string[];
}
