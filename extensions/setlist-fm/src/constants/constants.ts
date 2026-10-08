export enum API {
  BASE_URL = "https://api.setlist.fm/rest/1.0",
  ARTIST_SEARCH = "/search/artists",
  SETLIST_SEARCH = "/search/setlists",
  ARTIST_SETLISTS = "/artist/:mbid/setlists",
  ARTIST_SETLISTS_PAST = "/artist/:mbid/setlists/past",
  ARTIST_SETLISTS_FUTURE = "/artist/:mbid/setlists/future",
  SETLIST_DETAILS = "/setlist/:setlistId",
}
