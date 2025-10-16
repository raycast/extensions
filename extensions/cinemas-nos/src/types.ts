export type GetRegionsResponse = {
  data: {
    theaterRegionList: {
      items: Region[];
    };
  };
};

export type Region = {
  uuid: string;
  name: string;
  order: string;
};

export type GetTheatersResponse = {
  data: {
    theaterList: {
      items: Theater[];
    };
  };
};

export type Theater = {
  uuid: string;
  name: string;
  regionuuid: string;
  address: {
    plaintext: string;
  };
  location: string;
  rooms: string;
};

export type GetMoviesResponse = {
  movies: Movie[];
};

export type Movie = {
  uuid: string;
  regionId: string;
  title: string;
  genre: string;
  classification: string;
  duration: string;
  portraitImagePath: string;
  detailurl: string;
};

export type GetSessionsResponse = {
  days: SessionDay[];
};

export type SessionDay = {
  name: string;
  theaters: SessionTheater[];
};

export type SessionTheater = {
  name: string;
  regionId: string;
  sessions: Session[];
};

export type Session = {
  uuid: string;
  time: string;
};
