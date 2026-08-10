import { Log, LogResponse, Source } from "../lib/types";
import { Logtail } from "../lib/logtail";
import { UseLogtailFetchRenderProps, useLogtailFetch } from "../hooks/useLogtailFetch";
import { ActionPanel, List, Action, Icon, Detail } from "@raycast/api";
import { useState } from "react";
import { useDefaultSourceId } from "../hooks/useDefaultSourceId";
import { QuerySources } from "./QuerySources";
import { getLogLevelColor, getQueryString, removeAnsi } from "../lib/helpers";
import { useMetadataTags } from "../hooks/useMetadataTags";
import { useSavedQueries } from "../hooks/useSavedQueries";

const QueryMessageAction = ({ onSubmit }: { onSubmit: () => void }) => {
  return (
    <Action.SubmitForm
      title="Query for Message"
      icon={Icon.MagnifyingGlass}
      onSubmit={onSubmit}
      shortcut={{ modifiers: ["cmd"], key: "q" }}
    />
  );
};

const ViewSourcesAction = ({ onSubmit }: { onSubmit: () => void }) => {
  return (
    <Action.SubmitForm
      title="View Sources"
      icon={Icon.Plug}
      onSubmit={onSubmit}
      shortcut={{ modifiers: ["cmd"], key: "s" }}
    />
  );
};

const CopyMessageAction = ({ content }: { content: string }) => {
  return <Action.CopyToClipboard title="Copy Message" content={content} shortcut={{ modifiers: ["cmd"], key: "m" }} />;
};

const CopyHostAction = ({ content }: { content: string }) => {
  return <Action.CopyToClipboard title="Copy Host" content={content} shortcut={{ modifiers: ["cmd"], key: "h" }} />;
};

const SaveQueryAction = ({ onSubmit }: { onSubmit: () => void }) => {
  return (
    <Action.SubmitForm
      title="Save Query"
      icon={Icon.SaveDocument}
      shortcut={{ modifiers: ["cmd"], key: "s" }}
      onSubmit={onSubmit}
    />
  );
};

const CopyRawLogAction = ({ content }: { content: string }) => {
  return <Action.CopyToClipboard title="Copy Raw Log" content={content} shortcut={{ modifiers: ["cmd"], key: "r" }} />;
};

const DetailLogMetadata = ({ log }: { log: Log }) => {
  const { data } = useMetadataTags();
  const tags = data ?? [];

  const customMetadata = tags
    .map((tag) => {
      if (log[tag.key]) {
        return (
          <Detail.Metadata.TagList title={tag.label}>
            <Detail.Metadata.TagList.Item text={log[tag.key]} color={tag.color} />
          </Detail.Metadata.TagList>
        );
      }
    })
    .filter((tag) => tag !== undefined);

  return (
    <Detail.Metadata>
      <Detail.Metadata.TagList title="Log Level">
        <Detail.Metadata.TagList.Item text={log["log.level"]} color={getLogLevelColor(log["log.level"])} />
      </Detail.Metadata.TagList>
      <Detail.Metadata.Label key="app" title="Logtail App" text={log._app} />
      <Detail.Metadata.Label key="host" title="Host" text={log.host} />
      {log.dt && <Detail.Metadata.Label key="timestamp" title="Timestamp" text={new Date(log.dt).toISOString()} />}
      {!!customMetadata.length && (
        <>
          <Detail.Metadata.Separator />
          {customMetadata}
        </>
      )}
    </Detail.Metadata>
  );
};

export const QueryLogs = ({ query: _query, sourceId: _sourceId }: { query: string; sourceId?: string }) => {
  const { data } = useDefaultSourceId();
  const [sourceId, setSourceId] = useState(_sourceId ?? data);
  const [showSources, setShowSources] = useState<boolean>();
  const [query, setQuery] = useState<string>(getQueryString(_query, sourceId).query ?? "");

  const renderComponent = ({ data, isLoading, mutate }: UseLogtailFetchRenderProps<LogResponse>) => {
    const { addQuery } = useSavedQueries();
    const handleSearchTextChange = (text: string) => {
      setQuery(text);
      mutate(Logtail.getLogs(`${text}`));
    };

    const handleSaveQuerySubmit = async () => {
      await addQuery(query);
      await mutate(Logtail.getLogs(query));
    };

    const handleQueryMessageSubmit = async (log: Log) => {
      const { query, params } = getQueryString(removeAnsi(log.message), sourceId);
      setQuery(query ?? "");
      mutate(Logtail.getLogs(params));
    };

    const handleQueryForSource = async (source: Source) => {
      setSourceId(source.id);
      setShowSources(false);
      const { params } = getQueryString(undefined, source.id);
      mutate(Logtail.getLogs(params));
    };

    if (showSources) {
      return <QuerySources onSubmit={handleQueryForSource} autoSelect={false} />;
    }

    // If we have no log data and no source id, show the query sources
    if (!sourceId) {
      return <QuerySources onSubmit={handleQueryForSource} />;
    }

    const renderLog = (log: Log, index: number) => {
      const accessories = [
        {
          tag: { value: "log-level" },
          text: { color: getLogLevelColor(log["log.level"]), value: log["log.level"] ?? "info" },
        },
        {
          tag: "host",
          text: log.host,
        },
        {
          tag: "timestamp",
          date: new Date(log.dt),
        },
      ];

      return (
        <List.Item
          key={index}
          title={removeAnsi(log.message)}
          actions={
            <ActionPanel>
              <Action.Push
                title="Show Details"
                icon={Icon.Info}
                key={`log-${index}`}
                target={
                  <Detail
                    markdown={`\`\`\`\n${removeAnsi(log.message)}\n\`\`\``}
                    actions={
                      <ActionPanel>
                        <CopyMessageAction content={removeAnsi(log.message)} />
                        <CopyHostAction content={log.host} />
                        <QueryMessageAction onSubmit={handleQueryMessageSubmit.bind(this, log)} />
                        <CopyRawLogAction content={JSON.stringify(log)} />
                      </ActionPanel>
                    }
                    metadata={<DetailLogMetadata log={log} />}
                  />
                }
              />
              <CopyHostAction content={log.host} />
              <CopyMessageAction content={removeAnsi(log.message)} />
              <QueryMessageAction onSubmit={handleQueryMessageSubmit.bind(this, log)} />
              <CopyRawLogAction content={JSON.stringify(log)} />
              <ViewSourcesAction onSubmit={setShowSources.bind(this, true)} />
              {!!query && <SaveQueryAction onSubmit={handleSaveQuerySubmit} />}
            </ActionPanel>
          }
          accessories={accessories}
        />
      );
    };

    const allMessages = data?.data.filter((log) => !!log.message) ?? [];

    return (
      <List
        searchText={query}
        isLoading={isLoading}
        onSearchTextChange={handleSearchTextChange}
        searchBarPlaceholder="Search for Logs"
        actions={
          <ActionPanel>
            <SaveQueryAction onSubmit={handleSaveQuerySubmit} />
            <Action.Push title="Select Source" target={<QuerySources onSubmit={handleQueryForSource} />}></Action.Push>
          </ActionPanel>
        }
      >
        {allMessages.map(renderLog)}
        {!allMessages.length && <List.EmptyView title="No logs found"></List.EmptyView>}
      </List>
    );
  };

  const { Render } = useLogtailFetch<LogResponse>(
    { url: `https://logtail.com/api/v1/query?${getQueryString(query, sourceId).params}` },
    renderComponent
  );

  return <Render />;
};
