import { ActionPanel, Icon, List, OpenInBrowserAction, showToast, ToastStyle } from "@raycast/api";
import { flow, pipe } from "fp-ts/lib/function";
import * as O from "fp-ts/Option";
import * as A from "fp-ts/ReadonlyArray";
import * as TE from "fp-ts/TaskEither";
import { useCallback, useEffect, useState } from "react";
import { fullSearch } from "./util/api";
import { is, isError, isUnauthorized } from "./util/fp";
import { DomainStatus, getStatusIcon, SearchResultWithStatus } from "./util/types";
import { QUERY_MIN_LENGTH, SEARCH_SUGGESTIONS, STATUS_DESCRIPTIONS, STATUS_MAPPING } from "./util/costants";
import useLoading from "./util/useLoading";

function DomainrSearch() {
  const [isValidApiKey, setIsValidApiKey] = useState(true);

  const loading = useLoading(false);
  const [results, setResults] = useState<ReadonlyArray<SearchResultWithStatus>>([]);
  const [query, setQuery] = useState("");

  const performSearch = useCallback(
    flow(
      fullSearch,
      TE.map(
        flow(
          A.filter(O.isSome),
          A.map((o) => o.value),
          setResults,
          loading.stop,
        ),
      ),
      TE.mapLeft((err) =>
        pipe(
          err,
          isUnauthorized,
          is,
          O.foldW(
            () =>
              pipe(
                err,
                isError,
                is, // returns O.some<null> if the error is a network error
                O.fold(
                  () => showToast(ToastStyle.Failure, "Failed to perform search", "Invalid response body"),
                  () => showToast(ToastStyle.Failure, "Failed to perform search", (err as Error).message),
                ),
              ),
            () => setIsValidApiKey(false),
          ),
          loading.stop,
        ),
      ),
    ),
    [results, loading],
  );

  // Perform Search
  useEffect(() => {
    if (query.length < QUERY_MIN_LENGTH) {
      loading.stop();
      return;
    }

    loading.start();

    performSearch(query)();
  }, [query]);

  return (
    <List isLoading={loading.status} onSearchTextChange={setQuery} throttle searchBarPlaceholder="Search domains">
      {query.length === 0 && isValidApiKey && !loading.status && (
        <List.Section title="Tips & Tricks">
          {SEARCH_SUGGESTIONS.map((item) => (
            <List.Item key={item.title} {...item} />
          ))}
        </List.Section>
      )}

      {!isValidApiKey && (
        <List.Item icon={Icon.ExclamationMark} title="Invalid API Key" accessoryTitle="Go to Extensions -> Domainr" />
      )}

      {results.map((result) => (
        <List.Item
          id={result.domain + result.path}
          key={result.domain + result.path}
          title={result.domain + result.path}
          subtitle={STATUS_MAPPING[result.status]}
          icon={getStatusIcon(STATUS_MAPPING[result.status])}
          accessoryTitle={STATUS_DESCRIPTIONS[result.status]}
          actions={
            <ActionPanel>
              {[DomainStatus.Available, DomainStatus.Aftermarket].includes(STATUS_MAPPING[result.status]) && (
                <OpenInBrowserAction title="Register" url={result.registerURL} />
              )}

              {![DomainStatus.Disallowed, DomainStatus.Reserved, DomainStatus.Invalid].includes(
                STATUS_MAPPING[result.status],
              ) && <OpenInBrowserAction title="Visit" url={`https://${result.domain}`} />}
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

export default DomainrSearch;
