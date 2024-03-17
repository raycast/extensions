export type ImageMeta = {
  hash: string;
  source: string;
  format: string;
  from: "clipboard" | "finder" | "selected";
  url: string;
  size: number;
  height?: number;
  width?: number;
  createdAt: number;
};

export interface Preferences {
  publicKey: string;
  privateKey: string;
  urlEndpoint: string;
}
