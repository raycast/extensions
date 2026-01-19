/**
 * Browse Convex Tables Command
 *
 * Browse and search documents in your Convex database tables.
 * Supports pagination, document viewing with detail panel, and quick actions.
 */

import {
  Action,
  ActionPanel,
  Icon,
  List,
  showToast,
  Toast,
} from "@raycast/api";
import { useState, useEffect } from "react";
import { useConvexAuth } from "./hooks/useConvexAuth";
import { useAuthenticatedListGuard } from "./components/AuthenticatedListGuard";
import {
  useTables,
  useTeams,
  useProjects,
  useDeployments,
} from "./hooks/useConvexData";
import {
  getDocuments,
  type Document,
  type TableInfo,
  type AuthOptions,
} from "./lib/api";

type ViewState = "tables" | "documents";

export default function BrowseTablesCommand() {
  const { session, selectedContext, isDeployKeyMode, deployKeyConfig } =
    useConvexAuth();
  const [viewState, setViewState] = useState<ViewState>("tables");
  const [selectedTable, setSelectedTable] = useState<TableInfo | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [documentsLoading, setDocumentsLoading] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | undefined>();
  const [showingDetail, setShowingDetail] = useState(true);
  const [expandedJsonDocs, setExpandedJsonDocs] = useState<Set<string>>(
    new Set(),
  );

  const accessToken = session?.accessToken ?? null;
  const deploymentName = selectedContext.deploymentName;

  // Fetch context data (only in OAuth mode - not available with deploy keys)
  const { data: teams } = useTeams(isDeployKeyMode ? null : accessToken);
  const { data: projects } = useProjects(
    isDeployKeyMode ? null : accessToken,
    selectedContext.teamId,
  );
  const { data: deployments } = useDeployments(
    isDeployKeyMode ? null : accessToken,
    selectedContext.projectId,
  );

  const selectedTeam = teams?.find((t) => t.id === selectedContext.teamId);
  const selectedProject = projects?.find(
    (p) => p.id === selectedContext.projectId,
  );
  const selectedDeployment = deployments?.find(
    (d) => d.name === deploymentName,
  );

  // Fetch tables (supports both OAuth and deploy key modes)
  const { data: tables, isLoading: tablesLoading } = useTables(
    accessToken,
    deploymentName,
    deployKeyConfig,
  );

  // Fetch documents when table is selected
  useEffect(() => {
    // Need either deploy key or OAuth credentials
    const canFetch = deployKeyConfig
      ? !!selectedTable
      : !!selectedTable && !!accessToken && !!deploymentName;

    if (!canFetch) return;

    async function fetchDocuments() {
      setDocumentsLoading(true);
      try {
        let result;
        if (deployKeyConfig) {
          // Deploy key mode
          const auth: AuthOptions = {
            deployKey: deployKeyConfig.deployKey,
            deploymentUrl: deployKeyConfig.deploymentUrl,
          };
          result = await getDocuments(auth, selectedTable!.name, { limit: 50 });
        } else {
          // OAuth mode
          result = await getDocuments(
            deploymentName!,
            accessToken!,
            selectedTable!.name,
            { limit: 50 },
          );
        }
        setDocuments(result.documents);
        setNextCursor(result.nextCursor);
      } catch (error) {
        console.error("Failed to fetch documents:", error);
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to load documents",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      } finally {
        setDocumentsLoading(false);
      }
    }

    fetchDocuments();
  }, [selectedTable, accessToken, deploymentName, deployKeyConfig]);

  // Load more documents
  const loadMore = async () => {
    if (!nextCursor || !selectedTable) return;

    // Need either deploy key or OAuth credentials
    const canFetch = deployKeyConfig ? true : !!accessToken && !!deploymentName;

    if (!canFetch) return;

    setDocumentsLoading(true);
    try {
      let result;
      if (deployKeyConfig) {
        // Deploy key mode
        const auth: AuthOptions = {
          deployKey: deployKeyConfig.deployKey,
          deploymentUrl: deployKeyConfig.deploymentUrl,
        };
        result = await getDocuments(auth, selectedTable.name, {
          limit: 50,
          cursor: nextCursor,
        });
      } else {
        // OAuth mode
        result = await getDocuments(
          deploymentName!,
          accessToken!,
          selectedTable.name,
          {
            limit: 50,
            cursor: nextCursor,
          },
        );
      }
      setDocuments((prev) => [...prev, ...result.documents]);
      setNextCursor(result.nextCursor);
    } catch (error) {
      console.error("Failed to load more documents:", error);
    } finally {
      setDocumentsLoading(false);
    }
  };

  // Handle authentication
  const authGuard = useAuthenticatedListGuard(
    "Connect your Convex account to browse tables",
  );
  if (authGuard) return authGuard;

  // No deployment selected
  if (!deploymentName) {
    return (
      <List>
        <List.EmptyView
          title="No Deployment Selected"
          description="Use 'Manage Projects' to select a deployment first"
        />
      </List>
    );
  }

  // Handle table selection
  const handleSelectTable = (table: TableInfo) => {
    setSelectedTable(table);
    setDocuments([]);
    setNextCursor(undefined);
    setViewState("documents");
  };

  // Handle going back
  const handleGoBack = () => {
    setSelectedTable(null);
    setDocuments([]);
    setNextCursor(undefined);
    setViewState("tables");
  };

  const isLoading = viewState === "tables" ? tablesLoading : documentsLoading;
  const contextSubtitle =
    selectedProject && selectedDeployment
      ? `${selectedProject.name} / ${selectedDeployment.deploymentType}`
      : deploymentName;

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={
        viewState === "documents" && showingDetail && documents.length > 0
      }
      navigationTitle={
        viewState === "tables" ? "Browse Tables" : `${selectedTable?.name}`
      }
      searchBarPlaceholder={
        viewState === "tables" ? "Search tables..." : "Search documents..."
      }
    >
      {/* Tables view */}
      {viewState === "tables" && tables && (
        <List.Section
          title={contextSubtitle}
          subtitle={`${tables.length} tables`}
        >
          {tables.map((table) => (
            <List.Item
              key={table.name}
              title={table.name}
              icon={Icon.List}
              accessories={
                table.documentCount
                  ? [{ text: `${table.documentCount} docs` }]
                  : []
              }
              actions={
                <ActionPanel>
                  <Action
                    title="Browse Documents"
                    icon={Icon.ArrowRight}
                    onAction={() => handleSelectTable(table)}
                  />
                  <Action.CopyToClipboard
                    title="Copy Table Name"
                    content={table.name}
                  />
                  <ActionPanel.Section>
                    <Action.OpenInBrowser
                      title="Open in Dashboard"
                      url={`https://dashboard.convex.dev/t/${selectedTeam?.slug}/${selectedProject?.slug}/${selectedDeployment?.deploymentType}/data?table=${table.name}`}
                    />
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}

      {/* Documents view */}
      {viewState === "documents" && (
        <>
          <List.Section
            title={selectedTable?.name}
            subtitle={`${documents.length} documents${nextCursor ? " (more available)" : ""}`}
          >
            {documents.map((doc) => {
              const isJsonExpanded = expandedJsonDocs.has(doc._id);
              const toggleJson = () => {
                setExpandedJsonDocs((prev) => {
                  const next = new Set(prev);
                  if (next.has(doc._id)) {
                    next.delete(doc._id);
                  } else {
                    next.add(doc._id);
                  }
                  return next;
                });
              };

              return (
                <List.Item
                  key={doc._id}
                  title={getDocumentTitle(doc)}
                  subtitle={
                    showingDetail ? undefined : getDocumentSubtitle(doc)
                  }
                  icon={Icon.Document}
                  accessories={
                    showingDetail
                      ? undefined
                      : [
                          {
                            date: new Date(doc._creationTime),
                            tooltip: "Created",
                          },
                        ]
                  }
                  detail={
                    <DocumentDetailPanel
                      document={doc}
                      showJson={isJsonExpanded}
                    />
                  }
                  actions={
                    <ActionPanel>
                      <Action
                        title={showingDetail ? "Hide Detail" : "Show Detail"}
                        icon={showingDetail ? Icon.EyeDisabled : Icon.Eye}
                        onAction={() => setShowingDetail(!showingDetail)}
                      />
                      <Action
                        title={isJsonExpanded ? "Hide JSON" : "Show JSON"}
                        icon={
                          isJsonExpanded ? Icon.ChevronUp : Icon.ChevronDown
                        }
                        onAction={toggleJson}
                        shortcut={{ modifiers: ["cmd"], key: "j" }}
                      />
                      <Action.CopyToClipboard
                        title="Copy Document JSON"
                        content={JSON.stringify(doc, null, 2)}
                        shortcut={{ modifiers: ["cmd"], key: "c" }}
                      />
                      <Action.CopyToClipboard
                        title="Copy Document Id"
                        content={doc._id}
                        shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                      />
                      <ActionPanel.Section>
                        <Action
                          title="Go Back"
                          icon={Icon.ArrowLeft}
                          onAction={handleGoBack}
                          shortcut={{ modifiers: ["cmd"], key: "[" }}
                        />
                        {nextCursor && (
                          <Action
                            title="Load More"
                            icon={Icon.ArrowDown}
                            onAction={loadMore}
                            shortcut={{ modifiers: ["cmd"], key: "l" }}
                          />
                        )}
                      </ActionPanel.Section>
                      <ActionPanel.Section>
                        <Action.OpenInBrowser
                          title="Open in Dashboard"
                          url={`https://dashboard.convex.dev/t/${selectedTeam?.slug}/${selectedProject?.slug}/${selectedDeployment?.deploymentType}/data?table=${selectedTable?.name}`}
                        />
                      </ActionPanel.Section>
                    </ActionPanel>
                  }
                />
              );
            })}
          </List.Section>

          {/* Load more item */}
          {nextCursor && !documentsLoading && (
            <List.Item
              title="Load More Documents"
              icon={Icon.ArrowDown}
              actions={
                <ActionPanel>
                  <Action
                    title="Load More"
                    icon={Icon.ArrowDown}
                    onAction={loadMore}
                  />
                </ActionPanel>
              }
            />
          )}
        </>
      )}

      {/* Empty states */}
      {viewState === "tables" && tables?.length === 0 && !tablesLoading && (
        <List.EmptyView
          title="No Tables Found"
          description="This deployment has no tables"
          icon={Icon.List}
        />
      )}

      {viewState === "documents" &&
        documents.length === 0 &&
        !documentsLoading && (
          <List.EmptyView
            title="No Documents Found"
            description={`The ${selectedTable?.name} table is empty`}
            icon={Icon.Document}
            actions={
              <ActionPanel>
                <Action
                  title="Go Back"
                  icon={Icon.ArrowLeft}
                  onAction={handleGoBack}
                />
              </ActionPanel>
            }
          />
        )}
    </List>
  );
}

// Document detail panel component
interface DocumentDetailPanelProps {
  document: Document;
  showJson: boolean;
}

function DocumentDetailPanel({ document, showJson }: DocumentDetailPanelProps) {
  // Get all fields in order
  const allFields = Object.entries(document);

  // Build markdown with JSON if expanded
  const markdown = showJson
    ? `
\`\`\`json
${JSON.stringify(document, null, 2)}
\`\`\`
`
    : undefined;

  return (
    <List.Item.Detail
      markdown={markdown}
      metadata={
        <List.Item.Detail.Metadata>
          {allFields.map(([key, value]) => (
            <List.Item.Detail.Metadata.Label
              key={key}
              title={key}
              text={formatFieldValue(key, value)}
            />
          ))}

          <List.Item.Detail.Metadata.Separator />

          <List.Item.Detail.Metadata.Label
            title="Raw JSON"
            text={
              showJson ? "Showing below (press ⌘J to hide)" : "Press ⌘J to show"
            }
            icon={showJson ? Icon.ChevronUp : Icon.ChevronDown}
          />
        </List.Item.Detail.Metadata>
      }
    />
  );
}

function getDocumentTitle(doc: Document): string {
  const titleFields = [
    "name",
    "title",
    "label",
    "text",
    "email",
    "username",
    "id",
  ];
  for (const field of titleFields) {
    if (doc[field] && typeof doc[field] === "string") {
      const value = doc[field] as string;
      return value.length > 40 ? value.substring(0, 40) + "..." : value;
    }
  }
  return doc._id;
}

function getDocumentSubtitle(doc: Document): string {
  const fields = Object.entries(doc)
    .filter(([key]) => !key.startsWith("_"))
    .slice(0, 2);

  if (fields.length === 0) return "Empty document";

  return fields
    .map(([key, value]) => `${key}: ${formatFieldValue(key, value)}`)
    .join(" | ");
}

function formatFieldValue(key: string, value: unknown): string {
  // Special handling for _creationTime
  if (key === "_creationTime" && typeof value === "number") {
    return new Date(value).toLocaleString();
  }

  if (value === null) return "null";
  if (value === undefined) return "undefined";
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number") return String(value);
  if (typeof value === "string") {
    if (value.length > 50) return `"${value.substring(0, 50)}..."`;
    return `"${value}"`;
  }
  if (Array.isArray(value)) {
    return `[${value.length} items]`;
  }
  if (typeof value === "object") {
    const keys = Object.keys(value);
    return `{${keys.length} fields}`;
  }
  return String(value);
}
