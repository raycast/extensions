export interface UploadResponse {
  success: boolean;
  id: string;
  title?: string | null;
  type: string;
  datetime: number;
  width: number;
  height: number;
  size: number;
  deletehash?: string | null;
  link: string;
}

interface Album {
  id: string;
  link: string;
  title: string;
  description: string;
  deletehash: string;
}

export interface AlbumGroup {
  album: Album;
  images: UploadResponse[];
}

export type StoreData = UploadResponse | AlbumGroup;
