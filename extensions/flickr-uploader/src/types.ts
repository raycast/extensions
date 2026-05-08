export type FlickrAuth = {
  accessToken: string;
  accessTokenSecret: string;
  userNsid: string;
  username: string;
  fullName?: string;
};

export type PendingOAuth = {
  requestToken: string;
  requestTokenSecret: string;
  createdAt: number;
};

export type FlickrPhotoset = {
  id: string;
  title: string;
  description?: string;
};

export type FlickrGroup = {
  id: string;
  name: string;
  privacy?: string;
};

export type FlickrPublishingContext = {
  photosets: FlickrPhotoset[];
  groups: FlickrGroup[];
};

export type UploadFormValues = {
  image: string[];
  title: string;
  description: string;
  tags: string;
  visibility: string;
  photosetId: string;
  newPhotosetTitle: string;
  groups: string[];
};
