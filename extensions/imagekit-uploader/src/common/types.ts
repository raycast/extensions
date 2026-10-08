export type ImageMeta = {
  /**
   * ImageKit file id, used to delete image
   */
  fileId: string;
  hash: string;
  source: string;
  format: string;
  from: 'clipboard' | 'finder';
  url: string;
  thumbnailUrl: string;
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
