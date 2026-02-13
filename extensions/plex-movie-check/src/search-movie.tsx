import {
  Action,
  ActionPanel,
  Clipboard,
  Form,
  Icon,
  List,
  getPreferenceValues,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useEffect, useMemo, useState } from "react";
import { MovieResult, findMovie } from "./plex";

interface Preferences {
  baseUrl: string;
  token: string;
  defaultExactTitle?: boolean;
}

interface SearchFormValues {
  title: string;
  year?: string;
  exactTitle?: boolean;
}

interface SearchInput {
  baseUrl: string;
  token: string;
  title: string;
  year?: number;
  exactTitle: boolean;
}

function formatMovieLine(movie: MovieResult): string {
  const year = movie.year ?? "unknown";
  return `${movie.title} (${year}) | section=${movie.sectionTitle} (${movie.sectionKey}) | ratingKey=${movie.ratingKey}`;
}

function SearchResultList({
  baseUrl,
  token,
  title,
  year,
  exactTitle,
}: SearchInput) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [matches, setMatches] = useState<MovieResult[]>([]);

  const searchLabel = useMemo(() => {
    const suffix = year ? ` (${year})` : "";
    return `${title}${suffix}`;
  }, [title, year]);

  useEffect(() => {
    let canceled = false;

    async function run() {
      setIsLoading(true);
      setError(undefined);
      try {
        const data = await findMovie({
          baseUrl,
          token,
          targetTitle: title,
          targetYear: year,
          exactTitle,
        });
        if (!canceled) {
          setMatches(data);
        }
      } catch (err) {
        if (!canceled) {
          setError(err instanceof Error ? err.message : "Unknown error");
          setMatches([]);
        }
      } finally {
        if (!canceled) {
          setIsLoading(false);
        }
      }
    }

    run();
    return () => {
      canceled = true;
    };
  }, [baseUrl, token, title, year, exactTitle]);

  if (error) {
    return (
      <List navigationTitle="Plex Movie Check" isLoading={isLoading}>
        <List.EmptyView
          icon={Icon.XMarkCircle}
          title="Search failed"
          description={error}
          actions={
            <ActionPanel>
              <Action.CopyToClipboard content={error} title="Copy Error" />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  if (!isLoading && matches.length === 0) {
    return (
      <List navigationTitle="Plex Movie Check" isLoading={isLoading}>
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title="No matches"
          description={`NOT_FOUND: '${searchLabel}'`}
        />
      </List>
    );
  }

  return (
    <List navigationTitle="Plex Movie Check" isLoading={isLoading}>
      {matches.map((movie) => {
        const yearLabel =
          movie.year !== undefined && movie.year !== null
            ? String(movie.year)
            : "unknown";
        const metadataUrl = movie.ratingKey
          ? `${baseUrl.replace(/\/$/, "")}/library/metadata/${movie.ratingKey}?X-Plex-Token=${encodeURIComponent(token)}`
          : undefined;

        return (
          <List.Item
            key={`${movie.sectionKey}:${movie.ratingKey}:${movie.title}:${movie.year ?? ""}`}
            icon={Icon.FilmStrip}
            title={movie.title}
            subtitle={yearLabel}
            accessories={[
              { tag: movie.sectionTitle },
              { text: `ratingKey: ${movie.ratingKey || "n/a"}` },
            ]}
            actions={
              <ActionPanel>
                {metadataUrl ? (
                  <Action.OpenInBrowser
                    url={metadataUrl}
                    title="Open Metadata XML"
                  />
                ) : null}
                <Action
                  icon={Icon.Clipboard}
                  title="Copy Result Line"
                  onAction={async () => {
                    await Clipboard.copy(formatMovieLine(movie));
                    await showToast({
                      style: Toast.Style.Success,
                      title: "Copied",
                      message: movie.title,
                    });
                  }}
                />
                <Action.CopyToClipboard
                  content={movie.ratingKey || ""}
                  title="Copy Rating Key"
                />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();
  const { push } = useNavigation();

  return (
    <Form
      navigationTitle="Search Plex Movie"
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Search"
            onSubmit={async (values: SearchFormValues) => {
              const title = values.title.trim();
              if (!title) {
                await showToast({
                  style: Toast.Style.Failure,
                  title: "Title is required",
                });
                return;
              }

              const rawYear = (values.year ?? "").trim();
              let year: number | undefined;

              if (rawYear.length > 0) {
                year = Number.parseInt(rawYear, 10);
                if (Number.isNaN(year)) {
                  await showToast({
                    style: Toast.Style.Failure,
                    title: "Invalid year",
                    message: "Enter a numeric year like 2010",
                  });
                  return;
                }
              }

              await push(
                <SearchResultList
                  baseUrl={preferences.baseUrl}
                  token={preferences.token}
                  title={title}
                  year={year}
                  exactTitle={Boolean(values.exactTitle)}
                />,
              );
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="title"
        title="Movie Title"
        placeholder="Inception"
        autoFocus
      />
      <Form.TextField
        id="year"
        title="Year"
        placeholder="Optional, e.g. 2010"
      />
      <Form.Checkbox
        id="exactTitle"
        title="Exact Title"
        label="Require exact normalized title match"
        defaultValue={Boolean(preferences.defaultExactTitle)}
      />
    </Form>
  );
}
