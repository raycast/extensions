import { useCachedState } from "@raycast/utils";
import { Movie, Quote } from "./types";
import { DEFAULT_ICON, MOVIES_WITH_QUOTES } from "./constants";
import { Action, ActionPanel, Icon, List } from "@raycast/api";
import ErrorComponent from "./ErrorComponent";
import { useState } from "react";
import { useLOTR } from "./utils/useLOTR";

export default function Movies() {
  const { isLoading, data, error } = useLOTR<Movie>("movie", "Movies");

  return error ? (
    <ErrorComponent message={error.message} />
  ) : (
    <List isShowingDetail isLoading={isLoading}>
      {data?.map((movie) => (
        <List.Item
          key={movie._id}
          title={movie.name}
          icon={Icon.FilmStrip}
          detail={
            <List.Item.Detail
              metadata={
                <List.Item.Detail.Metadata>
                  <List.Item.Detail.Metadata.Label title="_id" text={movie._id} />
                  <List.Item.Detail.Metadata.Label title="Name" text={movie.name} />
                  <List.Item.Detail.Metadata.Label
                    title="Runtime In Minutes"
                    text={movie.runtimeInMinutes.toString()}
                  />
                  <List.Item.Detail.Metadata.Label
                    title="Budget In Millions"
                    text={movie.budgetInMillions.toString()}
                  />
                  <List.Item.Detail.Metadata.Label
                    title="Box Office Revenue In Millions"
                    text={movie.boxOfficeRevenueInMillions.toString()}
                  />
                  <List.Item.Detail.Metadata.Label
                    title="Academy Award Nominations"
                    text={movie.academyAwardNominations.toString()}
                  />
                  <List.Item.Detail.Metadata.Label
                    title="Academy Award Wins"
                    text={movie.academyAwardWins.toString()}
                  />
                  <List.Item.Detail.Metadata.Label
                    title="Rotten Tomatoes Score"
                    text={movie.rottenTomatoesScore.toString()}
                  />
                </List.Item.Detail.Metadata>
              }
            ></List.Item.Detail>
          }
          actions={
            <ActionPanel>
              <Action.Push title="View Quotes" target={<Quotes movie={movie} />} icon={Icon.Megaphone} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function Quotes({ movie }: { movie: Movie }) {
  const { _id: movieId, name: movieName } = movie;
  const title = `Quotes in ${movieName}`;

  const [savedQuotes, setSavedQuotes] = useCachedState<Quote[]>("saved-quotes", []);
  const [filter, setFilter] = useState("");

  const { isLoading, data, pagination, error, totalItems } = useLOTR<Quote>(`movie/${movieId}/quote`, title);

  function removeFromSavedQuotes(quoteId: string) {
    setSavedQuotes((prev) => prev.filter((q) => q._id !== quoteId));
  }
  function addToSavedQuotes(quote: Quote) {
    setSavedQuotes((prev) => [...prev, quote]);
  }

  const filteredQuotes = !filter
    ? data
    : data?.filter((quote) => (filter === "saved_quotes" ? savedQuotes.some((q) => q._id === quote.id) : true));

  return error ? (
    <ErrorComponent message={error.message} />
  ) : (
    <List
      pagination={pagination}
      navigationTitle={title}
      isLoading={isLoading}
      searchBarAccessory={
        <List.Dropdown tooltip="Filter" onChange={setFilter}>
          <List.Dropdown.Item title="All" value="" icon={Icon.Dot} />
          <List.Dropdown.Item title="Saved Quotes" value="saved_quotes" icon={Icon.Star} />
        </List.Dropdown>
      }
    >
      {!filteredQuotes?.length ? (
        <List.EmptyView icon={DEFAULT_ICON} title="No quotes matching this criteria" />
      ) : (
        <List.Section title={`${filteredQuotes?.length} of ${totalItems} Quotes`}>
          {filteredQuotes?.map((quote, quoteIndex) => {
            const isSaved = savedQuotes.some((q) => q._id === quote._id);

            return (
              <List.Item
                key={quote._id}
                title={`${quoteIndex + 1} - ${quote.dialog}`}
                icon={Icon.Megaphone}
                accessories={[{ icon: isSaved ? Icon.Star : undefined }]}
                actions={
                  <ActionPanel>
                    <Action.CopyToClipboard
                      title="Copy Quote to Clipboard"
                      content={quote.dialog}
                      icon={Icon.Clipboard}
                    />
                    {isSaved ? (
                      <Action
                        title="Remove From Saved Quotes"
                        onAction={() => removeFromSavedQuotes(quote._id)}
                        icon={Icon.Minus}
                      />
                    ) : (
                      <Action title="Add To Saved Quotes" onAction={() => addToSavedQuotes(quote)} icon={Icon.Plus} />
                    )}
                    <Action.Push title="View Saved Quotes" target={<SavedQuotes />} icon={Icon.Star} />
                  </ActionPanel>
                }
              />
            );
          })}
        </List.Section>
      )}
    </List>
  );
}

function SavedQuotes() {
  const [quotes] = useCachedState<Quote[]>("saved-quotes", []);

  return (
    <List navigationTitle="Saved Quotes" searchBarPlaceholder="Search Saved Quotes">
      {MOVIES_WITH_QUOTES.map((movie) => (
        <List.Section key={movie._id} title={`${movie.name} - ${movie._id}`}>
          {quotes
            .filter((quote) => quote.movie === movie._id)
            .map((quote) => (
              <List.Item key={quote._id} title={quote.dialog} />
            ))}
        </List.Section>
      ))}
    </List>
  );
}
