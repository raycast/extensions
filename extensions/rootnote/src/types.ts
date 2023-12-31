export class Suggestion {
  id: number;
  name: string;
  artist: Artist;
  master_child_song: MasterChildSong;
  stream_count: number;
}

class Artist {
  id: number;
  name: string;
  image: Image;
  uri: string;
}

class MasterChildSong {
  id: number;
  name: string;
  uri: string;
  album: Album;
}

class Album {
  id: number;
  name: string;
  image: Image;
  uri: string;
}

class Image {
  px64: string;
  px300: string;
  px640: string;
}
