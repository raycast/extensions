export type Image = {
  bucket: string;
  id: string;
};

export type EnhancedTrack = {
  id: string;
  song: {
    slug: string;
    name: string;
    artists: Array<{
      artist: {
        name: string;
        id: string;
        slug: string;
      };
    }>;
  };
  album: {
    name: string;
    id: string;
    slug: string;
    image: Image;
  };
};

export type Artist = {
  id: string;
  image: Image;
  name: string;
  slug: string;
};
