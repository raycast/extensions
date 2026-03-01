import {
  Action,
  ActionPanel,
  Icon,
  List,
  Toast,
  showToast,
  useNavigation,
} from "@raycast/api";
import {
  runSearchPipeline,
  SrP4Adapter,
  type SearchPipelineResult,
  type SearchQuery,
} from "@filipkillander/radiokollen-sdk";
import { mapErrorToUserMessage } from "@workspace/raycast-core";
import { useEffect, useMemo, useState } from "react";
import { saveHistory } from "./history-storage";
import {
  buildGroupDetailMarkdown,
  buildResultSummaryMarkdown,
  canSearchNextPeriod,
  queryToSummary,
  shiftQueryPeriod,
} from "./shared";

type SearchState =
  | { status: "loading"; progressText: string }
  | { status: "success"; result: SearchPipelineResult }
  | { status: "error"; message: string };

type SearchResultsViewProps = {
  query: SearchQuery;
};

export function SearchResultsView({ query }: SearchResultsViewProps) {
  const adapter = useMemo(() => new SrP4Adapter(), []);
  const { push } = useNavigation();
  const [state, setState] = useState<SearchState>({
    status: "loading",
    progressText: "Förbereder sökning...",
  });

  const queryKey = useMemo(() => JSON.stringify(query), [query]);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    async function run() {
      setState({ status: "loading", progressText: "Förbereder sökning..." });

      try {
        const result = await runSearchPipeline(adapter, query, {
          signal: controller.signal,
          onProgress: (progress) => {
            if (!active) {
              return;
            }

            setState({
              status: "loading",
              progressText: `Hämtar låtdata... ${progress.completed}/${progress.total}`,
            });
          },
        });

        if (!active || controller.signal.aborted || result.aborted) {
          return;
        }

        await saveHistory(query);
        setState({ status: "success", result });
      } catch (error) {
        if (!active || controller.signal.aborted) {
          return;
        }

        const mapped = mapErrorToUserMessage(error);
        setState({ status: "error", message: mapped.message });

        await showToast({
          style: Toast.Style.Failure,
          title: "Sökningen misslyckades",
          message: mapped.message,
        });
      }
    }

    void run();

    return () => {
      active = false;
      controller.abort();
    };
  }, [adapter, query, queryKey]);

  const openShiftedPeriod = (direction: "previous" | "next") => {
    const shiftedQuery = shiftQueryPeriod(query, direction);
    push(<SearchResultsView query={shiftedQuery} />);
  };

  if (state.status === "loading") {
    return (
      <List isLoading searchBarPlaceholder={state.progressText}>
        <List.EmptyView
          title="Söker i P4..."
          description={state.progressText}
        />
      </List>
    );
  }

  if (state.status === "error") {
    return (
      <List>
        <List.Item
          title="Sökningen misslyckades"
          subtitle={state.message}
          icon={Icon.ExclamationMark}
          actions={
            <ActionPanel>
              <Action
                title="Sök Föregående Period"
                onAction={() => openShiftedPeriod("previous")}
                icon={Icon.ArrowLeft}
              />
              {canSearchNextPeriod(query) ? (
                <Action
                  title="Sök Kommande Period"
                  onAction={() => openShiftedPeriod("next")}
                  icon={Icon.ArrowRight}
                />
              ) : null}
              <Action.CopyToClipboard
                title="Kopiera Feltext"
                content={state.message}
              />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  const { result } = state;

  return (
    <List isShowingDetail searchBarPlaceholder="Filtrera träffar...">
      <List.Section title="Sammanfattning">
        <List.Item
          title={
            result.totalPlays > 0
              ? "Spelad inom valt intervall"
              : "Inte spelad inom valt intervall"
          }
          subtitle={queryToSummary(result.query)}
          icon={result.totalPlays > 0 ? Icon.CheckCircle : Icon.MinusCircle}
          detail={
            <List.Item.Detail markdown={buildResultSummaryMarkdown(result)} />
          }
          actions={
            <ActionPanel>
              <Action
                title="Sök Föregående Period"
                onAction={() => openShiftedPeriod("previous")}
                icon={Icon.ArrowLeft}
              />
              {canSearchNextPeriod(query) ? (
                <Action
                  title="Sök Kommande Period"
                  onAction={() => openShiftedPeriod("next")}
                  icon={Icon.ArrowRight}
                />
              ) : null}
              <Action.CopyToClipboard
                title="Kopiera Sökfråga (JSON)"
                content={JSON.stringify(query, null, 2)}
              />
            </ActionPanel>
          }
        />
      </List.Section>

      <List.Section title={`Träffar (${result.totalSongs})`}>
        {result.groups.map((group) => (
          <List.Item
            key={group.key}
            title={`${group.artist} - ${group.title}`}
            subtitle={
              group.labels.length ? group.labels.join(", ") : "Label: (okänd)"
            }
            accessories={[{ text: `${group.plays.length} spelningar` }]}
            icon={Icon.Music}
            detail={
              <List.Item.Detail markdown={buildGroupDetailMarkdown(group)} />
            }
            actions={
              <ActionPanel>
                <Action.CopyToClipboard
                  title="Kopiera Låt"
                  content={`${group.artist} - ${group.title}`}
                />
                <Action.CopyToClipboard
                  title="Kopiera Detaljer (JSON)"
                  content={JSON.stringify(group, null, 2)}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>

      {result.failedChannels.length ? (
        <List.Section title={`Kanalfel (${result.failedChannels.length})`}>
          {result.failedChannels.map((failedChannel) => (
            <List.Item
              key={failedChannel.channelId}
              title={failedChannel.channelName}
              subtitle={failedChannel.reason}
              icon={Icon.Warning}
              actions={
                <ActionPanel>
                  <Action.CopyToClipboard
                    title="Kopiera Felorsak"
                    content={failedChannel.reason}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ) : null}
    </List>
  );
}
