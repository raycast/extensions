import { useFetch } from "@raycast/utils";
import {
  GetMoviesResponse,
  GetRegionsResponse,
  GetSessionsResponse,
  GetTheatersResponse,
  Movie,
  Region,
  SessionDay,
  Theater,
} from "./types";

const BASE_URL = "https://www.cinemas.nos.pt";

export function getRegions(): [Region[], boolean] {
  const { data, isLoading } = useFetch<GetRegionsResponse>(`${BASE_URL}/graphql/execute.json/cinemas/getAllRegions`);

  return [data?.data.theaterRegionList.items ?? [], isLoading];
}

export function getTheatersByRegion(region: Region): [Theater[], boolean] {
  const { data, isLoading } = useFetch<GetTheatersResponse>(
    `${BASE_URL}/graphql/execute.json/cinemas/getTheatersByRegion;uuid=${region.uuid}`
  );

  return [data?.data.theaterList.items ?? [], isLoading];
}

export function getMoviesByTheater(theater: Theater): [Movie[], boolean] {
  const { data, isLoading } = useFetch<GetMoviesResponse>(
    `${BASE_URL}/cinemas/_jcr_content/root/container/container/theater_list.getTheaterMovies.html?theateruuid=${theater.uuid}`
  );

  return [data?.movies ?? [], isLoading];
}

export function getSessionsByMovie(movie: Movie): [SessionDay[], boolean] {
  const { data, isLoading } = useFetch<GetSessionsResponse>(
    `${BASE_URL}${movie.detailurl.replaceAll(
      ".html",
      ""
    )}/_jcr_content/root/movie_detail.getMovieSessions.html?movieuuid=${movie.uuid}`
  );

  return [data?.days ?? [], isLoading];
}
