import { ActionPanel, List, Action, Icon } from "@raycast/api";
import { getMoviesByTheater, getRegions, getSessionsByMovie, getTheatersByRegion } from "./api";
import { Movie, Region, Theater } from "./types";

export default function Command() {
  const [regions, loadingRegions] = getRegions();

  return (
    <List isLoading={loadingRegions} searchBarPlaceholder="Search by region or place..." filtering={true}>
      {regions.map((region) => (
        <List.Item
          key={region.uuid}
          icon={Icon.Geopin}
          title={region.name}
          actions={
            <ActionPanel>
              <Action.Push title="Show Locations" target={<Region region={region} />} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function Region({ region }: { region: Region }) {
  const [theaters, loadingTheaters] = getTheatersByRegion(region);

  return (
    <List isLoading={loadingTheaters}>
      {theaters.map((theater) => (
        <List.Item
          key={theater.uuid}
          icon={Icon.House}
          title={theater.name}
          actions={
            <ActionPanel>
              <Action.Push title="Show Movies" target={<Theater theater={theater} />} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function Theater({ theater }: { theater: Theater }) {
  const [movies, loadingMovies] = getMoviesByTheater(theater);

  return (
    <List isLoading={loadingMovies}>
      {movies.map((movie) => (
        <List.Item
          key={movie.uuid}
          icon={Icon.FilmStrip}
          title={movie.title}
          actions={
            <ActionPanel>
              <Action.Push title="Show Sessions" target={<Sessions movie={movie} theater={theater} />} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function Sessions({ movie, theater }: { movie: Movie; theater: Theater }) {
  const [sessionDays, loadingSessionDays] = getSessionsByMovie(movie);

  return (
    <List isLoading={loadingSessionDays}>
      {sessionDays.map((day) => (
        <List.Section key={day.name} title={day.name}>
          {day.theaters
            .filter((sessionTheater) => sessionTheater.name === theater.name)
            .flatMap((theater) =>
              theater.sessions.map((session) => (
                <List.Item
                  key={session.uuid}
                  icon={Icon.Clock}
                  title={session.time}
                  actions={
                    <ActionPanel>
                      <Action.OpenInBrowser url={`https://www.cinemas.nos.pt${movie.detailurl}`} />
                    </ActionPanel>
                  }
                />
              ))
            )}
        </List.Section>
      ))}
    </List>
  );
}
