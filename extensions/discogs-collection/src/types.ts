export interface DiscogsArtist {
  id: number;
  name: string;
  role: string;
}

export interface DiscogsLabel {
  id: number;
  name: string;
  catno: string;
}

export interface DiscogsFormat {
  name: string;
  qty: string;
  descriptions?: string[];
}

export interface DiscogsTrack {
  position: string;
  title: string;
  duration: string;
  type_: string;
}

export interface DiscogsImage {
  type: string;
  uri: string;
  uri150: string;
  width: number;
  height: number;
}

export interface BasicInformation {
  id: number;
  title: string;
  year: number;
  artists: DiscogsArtist[];
  labels: DiscogsLabel[];
  formats: DiscogsFormat[];
  genres: string[];
  styles: string[];
  cover_image: string;
  thumb: string;
  resource_url: string;
}

export interface CollectionItem {
  id: number;
  instance_id: number;
  date_added: string;
  rating: number;
  basic_information: BasicInformation;
}

export interface CollectionResponse {
  pagination: {
    page: number;
    pages: number;
    per_page: number;
    items: number;
  };
  releases: CollectionItem[];
}

export interface ReleaseDetail {
  id: number;
  title: string;
  year: number;
  artists: DiscogsArtist[];
  labels: DiscogsLabel[];
  formats: DiscogsFormat[];
  genres: string[];
  styles: string[];
  tracklist: DiscogsTrack[];
  images: DiscogsImage[];
  notes: string;
  country: string;
  uri: string;
}
