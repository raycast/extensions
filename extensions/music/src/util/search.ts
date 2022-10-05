import { Track } from "./models";

export enum SortOption {
  Default = "Artist",
  DateAdded = "Date Added",
  PlayedCount = "Played Count",
  PlayedDuration = "Played Duration",
  Album = "Album",
  Title = "Title",
}

export const filterTracks = (tracks: Track[], search: string, genre: string, option: SortOption) => {
  // sort by the genre if it is set using the dropdown
  tracks = tracks.filter((track: Track) => genre === "all" || track.genre === genre);
  // filter the tracks by the search query
  tracks = tracks.filter((track: Track) => {
    return (
      track.name.toLowerCase().includes(search) ||
      track.album.toLowerCase().includes(search) ||
      track.artist.toLowerCase().includes(search)
    );
  });
  tracks = tracks.sort((a: Track, b: Track) => {
    let sortValue = 0;
    // sort the results (name matches first, then album, then artist)
    if (search) {
      sortValue += filterResults(a, b, search);
    }
    // sort by the option selected using the dropdown
    switch (option) {
      case SortOption.DateAdded:
        sortValue +=
          b.dateAdded - a.dateAdded ||
          a.artist.localeCompare(b.artist) ||
          a.album.localeCompare(b.album) ||
          a.name.localeCompare(b.name);
        break;
      case SortOption.PlayedCount:
        sortValue +=
          b.playedCount - a.playedCount ||
          a.artist.localeCompare(b.artist) ||
          a.album.localeCompare(b.album) ||
          a.name.localeCompare(b.name);
        break;
      case SortOption.PlayedDuration:
        sortValue += b.playedCount * b.duration - a.playedCount * a.duration;
        break;
      case SortOption.Album:
        sortValue += a.album.localeCompare(b.album) || a.name.localeCompare(b.name);
        break;
      case SortOption.Title:
        sortValue += a.name.localeCompare(b.name);
        break;
      case SortOption.Default:
      default:
        sortValue += a.artist.localeCompare(b.artist) || a.album.localeCompare(b.album) || a.name.localeCompare(b.name);
    }
    return sortValue;
  });
  return tracks;
};

export const filterResults = (a: Track, b: Track, search: string) => {
  const indexOf = (a: string, b: string) => {
    const index = a.toLowerCase().indexOf(b.toLowerCase());
    return index === -1 ? Infinity : 0;
  };
  return (
    indexOf(a.name, search) - indexOf(b.name, search) ||
    indexOf(a.album, search) - indexOf(b.album, search) ||
    indexOf(a.artist, search) - indexOf(b.artist, search)
  );
};
