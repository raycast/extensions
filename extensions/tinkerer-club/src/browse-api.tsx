import { Action, ActionPanel, Detail, Icon, List, Toast, showToast } from "@raycast/api";
import { useEffect, useMemo, useState } from "react";
import { getApiClient } from "./api/preferences";
import { ProcedureRunner } from "./components/procedure-runner";
import { errorMessage } from "./lib/json";
import { ApiCatalog, ApiProcedure } from "./types/api";

type ProcedureFilter = "all" | "mutation" | "query";

interface ProcedureDetailProps {
  client: ReturnType<typeof getApiClient>;
  procedure: ApiProcedure;
}

function ProcedureDetail({ client, procedure }: ProcedureDetailProps) {
  const markdown = [
    `# ${procedure.path}`,
    "",
    `${procedure.type === "query" ? "Read-only query" : "Mutation"} · ${procedure.tags.join(", ")}`,
    "",
    procedure.description,
    "",
    "## Input schema",
    "",
    `\`\`\`\`json\n${JSON.stringify(procedure.inputSchema, null, 2)}\n\`\`\`\``,
  ].join("\n");

  return (
    <Detail
      navigationTitle={procedure.path}
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action.Push
            title={procedure.type === "query" ? "Run Query" : "Configure Mutation"}
            icon={procedure.type === "query" ? Icon.Play : Icon.Hammer}
            target={<ProcedureRunner client={client} procedure={procedure} />}
          />
          <Action.CopyToClipboard title="Copy Procedure Path" content={procedure.path} />
          <Action.OpenInBrowser title="Open API Docs" url={client.docsUrl} icon={Icon.Code} />
        </ActionPanel>
      }
    />
  );
}

export default function BrowseApiCommand() {
  const client = useMemo(() => getApiClient(), []);
  const [catalog, setCatalog] = useState<ApiCatalog>();
  const [filter, setFilter] = useState<ProcedureFilter>("all");
  const [isLoading, setIsLoading] = useState(true);
  const [failure, setFailure] = useState<string>();
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      setIsLoading(true);
      setFailure(undefined);
      try {
        setCatalog(await client.catalog(controller.signal));
      } catch (error) {
        if (controller.signal.aborted) return;
        const message = errorMessage(error);
        setFailure(message);
        await showToast({ style: Toast.Style.Failure, title: "Could Not Load API Catalog", message });
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    }
    void load();
    return () => controller.abort();
  }, [client, revision]);

  const groups = useMemo(() => {
    const filtered = (catalog?.procedures ?? []).filter((procedure) => filter === "all" || procedure.type === filter);
    const byTag = new Map<string, ApiProcedure[]>();
    for (const procedure of filtered) {
      const tag = procedure.tags[0] ?? "Other";
      byTag.set(tag, [...(byTag.get(tag) ?? []), procedure]);
    }
    return [...byTag.entries()].sort(([left], [right]) => left.localeCompare(right));
  }, [catalog, filter]);

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search API procedures"
      searchBarAccessory={
        <List.Dropdown
          tooltip="Procedure Type"
          value={filter}
          onChange={(value) => setFilter(value as ProcedureFilter)}
        >
          <List.Dropdown.Item value="all" title="All Procedures" />
          <List.Dropdown.Item value="query" title="Queries" icon={Icon.Eye} />
          <List.Dropdown.Item value="mutation" title="Mutations" icon={Icon.Hammer} />
        </List.Dropdown>
      }
    >
      {groups.map(([tag, procedures]) => (
        <List.Section key={tag} title={tag} subtitle={`${procedures.length}`}>
          {procedures.map((procedure) => (
            <List.Item
              key={procedure.path}
              icon={procedure.type === "query" ? Icon.Eye : Icon.Hammer}
              title={procedure.path}
              subtitle={procedure.description}
              keywords={[...procedure.tags, procedure.type]}
              accessories={[{ tag: procedure.type }]}
              actions={
                <ActionPanel>
                  <Action.Push
                    title="View Procedure"
                    target={<ProcedureDetail client={client} procedure={procedure} />}
                  />
                  <Action.Push
                    title={procedure.type === "query" ? "Run Query" : "Configure Mutation"}
                    icon={procedure.type === "query" ? Icon.Play : Icon.Hammer}
                    target={<ProcedureRunner client={client} procedure={procedure} />}
                  />
                  <Action.CopyToClipboard title="Copy Procedure Path" content={procedure.path} />
                  <Action.OpenInBrowser title="Open API Docs" url={client.docsUrl} icon={Icon.Code} />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ))}
      {!isLoading && !catalog ? (
        <List.EmptyView
          title="Could Not Load API Catalog"
          description={failure ?? "The catalog response was unavailable."}
          icon={Icon.Warning}
          actions={
            <ActionPanel>
              <Action title="Retry" icon={Icon.ArrowClockwise} onAction={() => setRevision((value) => value + 1)} />
              <Action.OpenInBrowser title="Open API Docs" url={client.docsUrl} icon={Icon.Code} />
            </ActionPanel>
          }
        />
      ) : null}
    </List>
  );
}
