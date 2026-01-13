export type PicsumArguments = { width: string; height: string; grayscale: string };
export type PicsumImage = {
  id: string;
  author: string;
  width: number;
  height: number;
  url: string;
  download_url: string;
};
