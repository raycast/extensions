import { usePotterDB } from "./lib/use-potter-db";
import { Movie } from "./lib/types";
import { List } from "@raycast/api";
import { generateImageMarkdown } from "./lib/generate-image-markdown";

export default function Movies() {
  const { data: movies, isLoading, pagination } = usePotterDB<Movie>("movies", "Movies");

  return (
    <List isLoading={isLoading} isShowingDetail pagination={pagination}>
      <MoviesSection
        title="Harry Potter and the"
        movies={movies.filter((movie) => movie.attributes.title.startsWith("Harry Potter"))}
      />
      <MoviesSection
        title="Fantastic Beasts"
        movies={movies.filter((movie) => movie.attributes.title.startsWith("Fantastic Beasts"))}
      />
    </List>
  );
}

function MoviesSection({ title, movies }: { title: string; movies: Movie[] }) {
  return (
    <List.Section title={title + " ..."}>
      {movies.map((movie) => (
        <List.Item
          key={movie.id}
          title={"... " + movie.attributes.title.replace(title, "")}
          icon={movie.attributes.poster}
          detail={
            <List.Item.Detail
              markdown={`${generateImageMarkdown(movie.attributes.poster)} \n\n ${movie.attributes.summary}`}
              metadata={
                <List.Item.Detail.Metadata>
                  <List.Item.Detail.Metadata.Label title="ID" text={movie.id} />
                  <List.Item.Detail.Metadata.Label title="Slug" text={movie.attributes.slug} />
                  <List.Item.Detail.Metadata.Label title="Box Office" text={movie.attributes.box_office} />
                  <List.Item.Detail.Metadata.Label title="Budget" text={movie.attributes.budget} />
                  <List.Item.Detail.Metadata.TagList title="Cinematographers">
                    {movie.attributes.cinematographers.map((cinematographer) => (
                      <List.Item.Detail.Metadata.TagList.Item key={cinematographer} text={cinematographer} />
                    ))}
                  </List.Item.Detail.Metadata.TagList>
                  <List.Item.Detail.Metadata.TagList title="Directors">
                    {movie.attributes.directors.map((director) => (
                      <List.Item.Detail.Metadata.TagList.Item key={director} text={director} />
                    ))}
                  </List.Item.Detail.Metadata.TagList>
                  <List.Item.Detail.Metadata.TagList title="Distributors">
                    {movie.attributes.distributors.map((distributor) => (
                      <List.Item.Detail.Metadata.TagList.Item key={distributor} text={distributor} />
                    ))}
                  </List.Item.Detail.Metadata.TagList>
                  <List.Item.Detail.Metadata.TagList title="Editors">
                    {movie.attributes.editors.map((editor) => (
                      <List.Item.Detail.Metadata.TagList.Item key={editor} text={editor} />
                    ))}
                  </List.Item.Detail.Metadata.TagList>
                  <List.Item.Detail.Metadata.TagList title="Music Composers">
                    {movie.attributes.music_composers.map((music_composer) => (
                      <List.Item.Detail.Metadata.TagList.Item key={music_composer} text={music_composer} />
                    ))}
                  </List.Item.Detail.Metadata.TagList>
                  <List.Item.Detail.Metadata.Link
                    title="Poster"
                    text={movie.attributes.poster}
                    target={movie.attributes.poster}
                  />
                  <List.Item.Detail.Metadata.TagList title="Producers">
                    {movie.attributes.producers.map((producer) => (
                      <List.Item.Detail.Metadata.TagList.Item key={producer} text={producer} />
                    ))}
                  </List.Item.Detail.Metadata.TagList>
                  <List.Item.Detail.Metadata.TagList title="Rating">
                    <List.Item.Detail.Metadata.TagList.Item text={movie.attributes.rating} />
                  </List.Item.Detail.Metadata.TagList>
                  <List.Item.Detail.Metadata.Label title="Release Date" text={movie.attributes.release_date} />
                  <List.Item.Detail.Metadata.Label title="Running Time" text={movie.attributes.running_time} />
                  <List.Item.Detail.Metadata.TagList title="Screenwriters">
                    {movie.attributes.screenwriters.map((screenwriter) => (
                      <List.Item.Detail.Metadata.TagList.Item key={screenwriter} text={screenwriter} />
                    ))}
                  </List.Item.Detail.Metadata.TagList>
                  <List.Item.Detail.Metadata.Label title="Summary" text={movie.attributes.summary} />
                  <List.Item.Detail.Metadata.Label title="Title" text={movie.attributes.title} />
                  <List.Item.Detail.Metadata.Link
                    title="Trailer"
                    text={movie.attributes.trailer}
                    target={movie.attributes.trailer}
                  />
                  <List.Item.Detail.Metadata.Link
                    title="Wiki"
                    text={movie.attributes.wiki}
                    target={movie.attributes.wiki}
                  />
                </List.Item.Detail.Metadata>
              }
            />
          }
        />
      ))}
    </List.Section>
  );
}
