import { ActionPanel, Detail, OpenInBrowserAction } from "@raycast/api";
import { Movie, movieRating, movieTitle } from "./interfaces";

export function MovieDetail(props: { movie: Movie }) {
  const movie = props.movie;
  const markdownString = `
# ${movieTitle(movie)} • ${movie.year}
### ${movieRating(movie) ?? ""}

${movie.description ?? ""}

### ${movie.filmLength ? `Длительность: ${movie.filmLength}` : ""}

![Poster](${movie.posterUrl})
`;

  return (
    <Detail
      navigationTitle={movieTitle(movie)}
      markdown={markdownString}
      actions={
        <ActionPanel>
          <OpenInBrowserAction url={`https://www.kinopoisk.ru/film/${movie.filmId}/`} icon="kinopoisk.png" />
        </ActionPanel>
      }
    />
  );
}
