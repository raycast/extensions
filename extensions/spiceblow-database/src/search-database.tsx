import fs from "fs";
import kebabCase from "kebab-case";

import {
  Action,
  ActionPanel,
  Cache,
  Clipboard,
  Detail,
  Form,
  Icon,
  LaunchProps,
  List,
  LocalStorage,
  OAuth,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";

import { createDeeplink, DeeplinkType, FormValidation, useForm, usePromise, withAccessToken } from "@raycast/utils";
import { fetch } from "undici";

import { getAvatarIcon, OAuthService, useCachedPromise } from "@raycast/utils";
import { Fragment, useEffect, useMemo, useRef, useState } from "react";

import * as databaseFunctions from "./database.js";
import { getRequestsCount, incrementRequestsCount, notifyError } from "./raycast";
import {
  apiUrl,
  createBuyLink,
  generateRandomId,
  getDatabaseConnectionType,
  getQueryMarkdown,
  getStringColor,
  googleClientId,
  hideSensitiveDataFromUrl,
  isImageUrl,
  isTruthy,
  isValidUrl,
  validateGoogleToken,
} from "./utils";

import dedent from "string-dedent";
import { createClient } from "./generated/client-database";

import { writeFileSync } from "fs";
import React from "react";
import { SQLStatement } from "sql-template-strings";
import { renderColumnValue } from "./database.js";
import { useGlobalState } from "./state";
import {
  CustomQuery,
  CustomQueryType,
  GraphData,
  Json,
  launchContext,
  StoredDatabase,
  TableInfo,
  TimeSeriesItem,
  type LaunchContext,
} from "./types";

const pageSize = 20;
const freeRequestsCount = 50;

let abortController = new AbortController();

let googleEmail = "";
let googleIdToken = "";

export const apiClient = createClient({
  url: apiUrl,
  fetch,
  googleToken() {
    return googleIdToken;
  },
});

const googleIcon = `<svg xmlns="http://www.w3.org/2000/svg" style="display:block" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/><path fill="none" d="M0 0h48v48H0z"/></svg>`;

const google = new OAuthService({
  clientId: googleClientId,

  scope: "https://www.googleapis.com/auth/userinfo.email",

  async onAuthorize({ idToken }) {
    const res = await validateGoogleToken(idToken);
    googleEmail = res?.googleEmail || "";
    googleIdToken = idToken || "";
  },
  client: new OAuth.PKCEClient({
    redirectMethod: OAuth.RedirectMethod.AppURI,
    providerName: "Spiceblow",
    providerIcon: `data:image/svg+xml,${googleIcon}`,
    providerId: "google",
    description:
      "Sign in with Google to proceed. This step is necessary to link your purchased license to your account later.",
  }),
  authorizeUrl: "https://accounts.google.com/o/oauth2/v2/auth",
  tokenUrl: "https://oauth2.googleapis.com/token",
  bodyEncoding: "url-encoded",
});

function BuyLicense() {
  const buyLicenseUrl = createBuyLink({ googleEmail });

  return (
    <Fragment>
      <Detail
        navigationTitle="Free Requests Limit Reached"
        markdown={dedent`

          **You have reached the limit of free requests.**
          
          To continue using the extension you will need to buy a license.

          Your subscription will be linked to your Google account with email \`${googleEmail}\`.
          
          [Buy Spiceblow License](${buyLicenseUrl})

          After opening the Raycast extension again, your subscription will be synced automatically with Raycast.
        `}
      />
    </Fragment>
  );
}

const searchFilterCache = new Cache();

function useSearchFilter(id: string, defaultOne = "") {
  const [searchText, setSearchText] = useState(() => {
    return defaultOne || searchFilterCache.get(id) || "";
  });
  useEffect(() => {
    if (searchText !== defaultOne) {
      searchFilterCache.set(id, searchText);
    }
  }, [searchText, id, defaultOne]);
  return { searchText, setSearchText };
}

function SearchTable({ table }: { table: string }) {
  const { searchText, setSearchText } = useSearchFilter(table, launchContext?.searchText);
  const currentConnectionString = useGlobalState((x) => x.connectionString);

  const tableInfoData = useCachedPromise(
    async (table, _connectionString) => {
      const [schema, tableInfo] = await Promise.all([
        databaseFunctions.getDatabaseSchema({ schemas: [table], tables: [table] }),
        databaseFunctions.getTableInfo({ table }),
      ]);

      return { schema, tableInfo };
    },
    [table, currentConnectionString],
    {},
  );

  const tableInfo = tableInfoData.data?.tableInfo;
  const schema = tableInfoData.data?.schema;
  const [isLoading, setIsLoading] = useState(false);
  const { searchField, dropdown } = useTableFiltering({ tableInfo: tableInfo });

  const rows = useCachedPromise(
    (_connectionString, searchText, table) => {
      return async ({ page }) => {
        abortController.abort();
        abortController = new AbortController();
        incrementRequestsCount();

        const res = await databaseFunctions.searchTableRowsOrCustomQuery({
          searchText,
          pageSize,
          page,
          table,
          searchField,
          tableInfo: tableInfo,
          signal: abortController.signal,
          schema: schema,
        });

        return {
          data: res.data,
          hasMore: res.hasMore,
        };
      };
    },
    [currentConnectionString, searchText, table],
    { keepPreviousData: true },
  );
  const primaryKeyColumns = tableInfo?.columns.filter((col) => col.isPrimaryKey).map((col) => col.columnName) || [];
  const currentRowIds = new Set(
    rows.data?.map((row) => primaryKeyColumns.map((col) => row[col]).join(", ")).filter(Boolean) || [],
  );
  const selectedRows = useGlobalState((x) =>
    Array.isArray(x.selectedRows) ? x.selectedRows.filter((row) => currentRowIds.has(row)) : [],
  );

  const toggleRowSelection = useGlobalState((x) => x.toggleRowSelection);
  const { push } = useNavigation();

  const handleDeleteSelectedRows = async () => {
    const deleteQueries = (
      await Promise.all(
        selectedRows.map(async (primaryKeyValue) => {
          const row = rows.data?.find((r) => {
            return primaryKeyColumns.map((col) => r[col]).join(", ") === primaryKeyValue;
          });
          if (!row) {
            throw new Error(`Could not find row with primary key ${primaryKeyValue}`);
          }
          const result = await databaseFunctions.prepareTableRowDelete({
            allValues: tableInfo!.columns.map((col) => {
              return { ...col, oldValue: row[col.columnName] };
            }),
          });
          return result.deleteQueries;
        }),
      )
    ).flat();

    push(
      <DeleteRows
        revalidate={() => {
          rows.revalidate();
        }}
        deleteQueries={deleteQueries}
      />,
    );
  };

  const [, tableName] = table.split(".");

  return (
    <List
      pagination={{ hasMore: false, onLoadMore() {}, ...rows.pagination, pageSize }}
      searchText={searchText}
      isLoading={isLoading || rows.isLoading || tableInfoData.isLoading}
      onSearchTextChange={setSearchText}
      isShowingDetail
      searchBarAccessory={dropdown}
      actions={
        <ActionPanel>
          <NoRowsActions revalidate={() => rows.revalidate()} tableInfo={tableInfo!} />
          <RunTransactionQueries />
        </ActionPanel>
      }
      searchBarPlaceholder="Search rows..."
    >
      {rows.data?.map((row, index) => {
        const primaryKeyValue = primaryKeyColumns.map((col) => row[col]).join(", ") || String(index);
        const isSelected = selectedRows?.includes(primaryKeyValue);

        return (
          <List.Item
            key={primaryKeyValue}
            title={primaryKeyValue}
            icon={selectedRows.length > 0 ? { source: isSelected ? Icon.CheckCircle : Icon.Circle } : undefined}
            detail={
              <List.Item.Detail
                metadata={tableInfo && <RowMetadata tableName={tableName} tableInfo={tableInfo} row={row} />}
              />
            }
            actions={
              <ActionPanel>
                {selectedRows.length > 0 && (
                  <>
                    <Action
                      title={isSelected ? "Deselect Row" : "Select Row"}
                      icon={isSelected ? Icon.CheckCircle : Icon.Circle}
                      onAction={() => toggleRowSelection(primaryKeyValue)}
                    />
                    <Action
                      title={`Delete ${selectedRows.length} Selected Row${selectedRows.length > 1 ? "s" : ""}`}
                      icon={Icon.Trash}
                      onAction={handleDeleteSelectedRows}
                      style={Action.Style.Destructive}
                    />
                    <Action
                      title="Deselect All Rows"
                      icon={Icon.XMarkCircle}
                      onAction={() => useGlobalState.getState().setSelectedRows([])}
                    />
                  </>
                )}

                {tableInfo && (
                  <RowUpdatesActions revalidate={() => rows.revalidate()} tableInfo={tableInfo} row={row} />
                )}
                {!selectedRows.length && (
                  <Action
                    title={"Select Row"}
                    icon={Icon.CheckCircle}
                    onAction={() => toggleRowSelection(primaryKeyValue)}
                  />
                )}
                <CountAction table={table} />
                <ExportToCsvAction tableInfo={tableInfo!} setIsLoading={setIsLoading} table={table} />
                <RunTransactionQueries />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
function CountAction({ table, query }: { table?: string; query?: string }) {
  const handleCount = async () => {
    try {
      const result = await databaseFunctions.countRows({ table, query });
      showToast({ style: Toast.Style.Success, title: `Row Count: ${result}` });
    } catch (error) {
      console.error("Error counting rows:", error);
      showToast({ style: Toast.Style.Failure, title: "Failed to count rows", message: String(error) });
    }
  };

  return <Action title="Count Rows" icon={Icon.List} onAction={handleCount} />;
}

function ExportToCsvAction({
  table = "",
  setIsLoading,
  query = "",
  tableInfo,
}: {
  table?: string;
  setIsLoading: (loading: boolean) => void;
  query?: string;
  tableInfo: TableInfo;
}) {
  const handleExport = async () => {
    setIsLoading(true);
    try {
      const databases = JSON.parse((await LocalStorage.getItem("databases")) || "[]");
      const currentConnectionString = useGlobalState.getState().connectionString;
      const currentDb = databases.find((db) => db.connectionString === currentConnectionString);
      const dbName = currentDb?.name || "";
      const tempFile = `/tmp/export-${dbName ? `${kebabCase(dbName)}-` : ""}${table ? `${kebabCase(table)}-` : ""}${Date.now()}.csv`;

      let page = 0;
      let hasMore = true;
      const pageSize = 3000;
      let isFirstPage = true;
      let totalRows = 0;
      while (hasMore) {
        console.log(`fetching page ${page}`);
        showToast({
          style: Toast.Style.Animated,
          title: `Fetching page ${page + 1}...`,
        });
        const { data: rows, hasMore: moreRows } = await databaseFunctions.searchTableRowsOrCustomQuery({
          table,
          query,
          page,
          pageSize,
        });

        totalRows += rows.length;

        // Convert all values to CSV-friendly strings
        for (const row of rows) {
          for (const column of tableInfo?.columns || []) {
            row[column.columnName] = databaseFunctions.renderColumnValueForCsv(column, row[column.columnName]);
          }
        }
        // Generate CSV for this batch, only include headers on first page
        const csvChunk = databaseFunctions.exportToCsv({
          rows,
          includeHeader: isFirstPage,
        });

        // Append to file (or write if first page)
        await fs.promises.writeFile(tempFile, csvChunk + "\n", { flag: isFirstPage ? "w" : "a" });

        hasMore = moreRows;
        page++;
        isFirstPage = false;
      }
      console.log(`fetched ${totalRows} rows`);

      const file = tempFile;
      await Clipboard.copy({ file });
      showToast({ style: Toast.Style.Success, title: "CSV file copied to clipboard" });
    } catch (error) {
      console.error("Error exporting to CSV:", error);
      showToast({ style: Toast.Style.Failure, title: "Failed to export CSV", message: String(error) });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Action title="Export as Csv File" icon={Icon.Download} onAction={() => handleExport()} />
    </>
  );
}

function NoRowsActions({ revalidate, tableInfo }: { revalidate: () => void; tableInfo: TableInfo }) {
  const { push } = useNavigation();
  return (
    <Action
      title="Insert New Row"
      icon={Icon.NewDocument}
      shortcut={{ modifiers: ["cmd"], key: "n" }}
      onAction={() => {
        push(<EditRow type="insert" revalidate={revalidate} tableInfo={tableInfo} />);
      }}
    />
  );
}

function RowUpdatesActions({
  revalidate,
  tableInfo,
  row,
}: {
  revalidate: () => void;
  tableInfo: TableInfo;
  row: Json;
}) {
  const { push } = useNavigation();
  return (
    <>
      <Action
        title="Update Row"
        icon={Icon.Pencil}
        onAction={() => {
          push(<EditRow type="edit" revalidate={revalidate} tableInfo={tableInfo} row={row} />);
        }}
      />
      <Action
        title="View Details"
        icon={Icon.Center}
        onAction={() => {
          push(<RowInfo tableInfo={tableInfo} row={row} />);
        }}
      />
      <Action
        title="Delete Row"
        icon={Icon.Trash}
        onAction={async () => {
          const { deleteQueries } = await databaseFunctions.prepareTableRowDelete({
            allValues: tableInfo.columns.map((col) => {
              return { ...col, oldValue: row[col.columnName] };
            }),
          });

          push(<DeleteRows revalidate={revalidate} deleteQueries={deleteQueries} />);
        }}
      />

      <NoRowsActions revalidate={revalidate} tableInfo={tableInfo} />
      <Action
        title="Duplicate Row"
        icon={Icon.Duplicate}
        shortcut={{ modifiers: ["cmd"], key: "d" }}
        onAction={() => {
          push(<EditRow type="duplicate" revalidate={revalidate} row={row} tableInfo={tableInfo} />);
        }}
      />
    </>
  );
}
const Graph = React.memo(function Graph(args: { rows: TimeSeriesItem[]; query: CustomQuery }) {
  const { push } = useNavigation();
  const graphUrl = useCachedPromise(
    async (rows: TimeSeriesItem[]) => {
      const categoriesWithCount: Map<string | undefined, number> = new Map();
      for (const row of rows) {
        const category = row.category;
        const count = categoriesWithCount.get(category) || 0;
        categoriesWithCount.set(category, count + row.count);
      }

      const sortedCategories = Array.from(categoriesWithCount.entries())
        .sort((a, b) => b[1] - a[1])
        .map(([category]) => category);

      const maxCategories = 10;
      const topCategories = sortedCategories.slice(0, maxCategories);
      const removedCategories = new Set(sortedCategories.slice(maxCategories));

      const categories = [...topCategories, ...(removedCategories.size > 0 ? ["others"] : [])];
      const timeBuckets = [...new Set(rows.map((x) => x.time_bucket))];

      const data: GraphData = {
        labels: timeBuckets as string[],
        datasets: categories.map((category) => {
          const categoryRows = rows.filter(
            (x) => x.category === category || (category === "others" && removedCategories.has(x.category || "others")),
          );
          const data = timeBuckets.map((timeBucket) => {
            const row = categoryRows.find((x) => x.time_bucket === timeBucket);
            return row ? Number(row.count) : 0;
          });
          return {
            label: category || "",
            data,
            backgroundColor: getStringColor(category || ""),
          };
        }),
      };

      const res = await apiClient.spiceblow.api.generateGraphUrl.post({
        rowsData: data,
      });
      if (res.error) {
        throw res.error;
      }
      return res.data?.url;
    },
    [args.rows],
    { keepPreviousData: true, execute: args.rows != null },
  );

  if (graphUrl.isLoading) {
    return <Detail isLoading />;
  }
  if (!args.rows) {
    return <Detail isLoading />;
  }

  const url = graphUrl.data;

  return (
    <Detail
      markdown={`![Graph](${url})\n\n`}
      actions={
        <ActionPanel>
          {url && (
            <Action
              title="Copy Image to Clipboard"
              onAction={async () => {
                const tempPath = `/tmp/graph-${Date.now()}.png`;
                await fetch(url)
                  .then((res) => res.arrayBuffer())
                  .then((buffer) => {
                    const uint8Array = new Uint8Array(buffer);
                    writeFileSync(tempPath, uint8Array);
                  });
                await Clipboard.copy({ file: tempPath });
                showToast({ title: "Image copied to clipboard", style: Toast.Style.Success });
              }}
              shortcut={{ modifiers: ["cmd"], key: "c" }}
            />
          )}
          <Action
            title="Update Query"
            shortcut={{ modifiers: ["cmd"], key: "u" }}
            icon={Icon.Pencil}
            onAction={() => {
              push(
                <GenerateCustomQueryForm
                  type={"time-series"}
                  revalidate={() => {
                    graphUrl.revalidate();
                  }}
                  existingQuery={args.query}
                />,
              );
            }}
          />
        </ActionPanel>
      }
    />
  );
});

function SearchCustomQuery(args: CustomQuery & { revalidate: () => void }) {
  const { query, schemas, tableInfo, id, bestField } = args;
  const { push } = useNavigation();
  const { searchText, setSearchText } = useSearchFilter(id);

  const currentConnectionString = useGlobalState((x) => x.connectionString);

  const toggleRowSelection = useGlobalState((x) => x.toggleRowSelection);

  const tables = [...new Set(tableInfo.columns.map((col) => col.tableName).filter(isTruthy))];
  const schema = useCachedPromise(
    async (_connectionString, selectedSchemas) => {
      const schema = await databaseFunctions.getDatabaseSchema({ schemas: selectedSchemas, tables });

      return schema;
    },
    [currentConnectionString, schemas],
    { keepPreviousData: true },
  );
  const { searchField, searchPlaceholder, dropdown } = useTableFiltering({ tableInfo });

  const rows = useCachedPromise(
    (_connectionString, searchText, query, searchField, tableInfo, schema) => {
      return async ({ page }) => {
        abortController.abort();
        abortController = new AbortController();
        incrementRequestsCount();
        const res = await databaseFunctions.searchTableRowsOrCustomQuery({
          searchText,
          pageSize: args.type === "time-series" ? 1000 : pageSize,
          page,
          query,
          signal: abortController.signal,
          searchField,
          tableInfo: tableInfo!,
          schema: schema!,
        });

        return {
          data: res.data,
          hasMore: res.hasMore,
        };
      };
    },
    [currentConnectionString, searchText, query, searchField, tableInfo, schema.data],
    { keepPreviousData: true },
  );
  const currentRowIds = new Set(rows.data?.map((row) => String(row[bestField])).filter(Boolean) || []);
  const selectedRows = useGlobalState((x) =>
    Array.isArray(x.selectedRows) ? x.selectedRows.filter((row) => currentRowIds.has(row)) : [],
  );

  const [isLoading, setIsLoading] = useState(false);
  const handleDeleteSelectedRows = async (tableName?: string) => {
    const deleteQueries = (
      await Promise.all(
        selectedRows.map(async (primaryKeyValue) => {
          const row = rows.data?.find((r) => {
            return String(r[bestField]) === primaryKeyValue;
          });
          if (!row) {
            throw new Error(
              `Could not find row with value ${primaryKeyValue} in field ${bestField}. Full row data: ${JSON.stringify(rows.data)}`,
            );
          }
          const result = await databaseFunctions.prepareTableRowDelete({
            allValues: tableInfo.columns
              .filter((col) => !tableName || col.tableName === tableName)
              .map((col) => {
                return { ...col, oldValue: row[col.columnName] };
              }),
          });
          return result.deleteQueries;
        }),
      )
    ).flat();

    push(
      <DeleteRows
        revalidate={() => {
          rows.revalidate();
        }}
        deleteQueries={deleteQueries}
      />,
    );
  };

  if (args.type === "time-series") {
    return <Graph query={args} rows={rows.data} />;
  }

  return (
    <List
      pagination={{ hasMore: false, onLoadMore() {}, ...rows.pagination, pageSize }}
      isLoading={isLoading || rows.isLoading}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      isShowingDetail
      searchBarAccessory={dropdown}
      actions={
        <ActionPanel>
          <NoRowsActions revalidate={() => rows.revalidate()} tableInfo={tableInfo} />
          <RunTransactionQueries />
        </ActionPanel>
      }
      searchBarPlaceholder={searchPlaceholder}
    >
      {rows.data?.map((row, index) => {
        const primaryKeyValue = String(row[bestField]) || String(index);
        const isSelected = selectedRows?.includes(primaryKeyValue);

        return (
          <List.Item
            key={primaryKeyValue + index}
            title={primaryKeyValue || " "}
            icon={selectedRows.length > 0 ? { source: isSelected ? Icon.CheckCircle : Icon.Circle } : undefined}
            detail={
              <List.Item.Detail
                metadata={tableInfo && <RowMetadata tableName={"query"} tableInfo={tableInfo} row={row} />}
              />
            }
            actions={
              <ActionPanel>
                {selectedRows.length > 0 && (
                  <>
                    <Action
                      title={isSelected ? "Deselect Row" : "Select Row"}
                      icon={isSelected ? Icon.CheckCircle : Icon.Circle}
                      onAction={() => toggleRowSelection(primaryKeyValue)}
                    />
                    {tables.map((tableName) => (
                      <Action
                        key={tableName}
                        title={`Delete ${selectedRows.length} in "${tableName}"`}
                        icon={Icon.Trash}
                        onAction={() => handleDeleteSelectedRows(tableName)}
                        style={Action.Style.Destructive}
                      />
                    ))}
                    <Action
                      title={`Delete ${selectedRows.length} Row${selectedRows.length > 1 ? "s" : ""} in All Tables`}
                      icon={Icon.Trash}
                      onAction={() => handleDeleteSelectedRows()}
                      style={Action.Style.Destructive}
                    />
                    <Action
                      title="Deselect All Rows"
                      icon={Icon.XMarkCircle}
                      onAction={() => useGlobalState.getState().setSelectedRows([])}
                    />
                  </>
                )}

                <RowUpdatesActions
                  revalidate={() => {
                    rows.revalidate();
                  }}
                  tableInfo={tableInfo}
                  row={row}
                />

                {!selectedRows.length && (
                  <Action
                    title={"Select Row"}
                    icon={Icon.CheckCircle}
                    onAction={() => toggleRowSelection(primaryKeyValue)}
                  />
                )}

                <CountAction query={query} />
                <ExportToCsvAction tableInfo={tableInfo} setIsLoading={setIsLoading} query={query} />
                {tables.map((tableName) => (
                  <Action
                    key={tableName}
                    title={`Delete Row in "${tableName}"`}
                    icon={Icon.Trash}
                    onAction={async () => {
                      const { deleteQueries } = await databaseFunctions.prepareTableRowDelete({
                        allValues: tableInfo.columns
                          .filter((col) => col.tableName === tableName)
                          .map((col) => {
                            return { ...col, oldValue: row[col.columnName] };
                          }),
                      });

                      push(
                        <DeleteRows
                          revalidate={() => {
                            rows.revalidate();
                          }}
                          deleteQueries={deleteQueries}
                        />,
                      );
                    }}
                  />
                ))}
                <RunTransactionQueries />
                <Action
                  title="Update Query"
                  shortcut={{ modifiers: ["cmd"], key: "u" }}
                  icon={Icon.Pencil}
                  onAction={() => {
                    push(
                      <GenerateCustomQueryForm
                        type="list"
                        revalidate={() => {
                          rows.revalidate();
                          schema.revalidate();
                          args.revalidate();
                        }}
                        existingQuery={args}
                      />,
                    );
                  }}
                />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
function RowMetadata({ tableName, tableInfo, row }: { tableName: string; tableInfo: TableInfo; row: Json }) {
  return (
    <List.Item.Detail.Metadata>
      {tableInfo?.columns?.map((col, idx) => {
        const value = row[col.columnName];
        const text = databaseFunctions.renderColumnValue(col, value);
        const isLast = idx === tableInfo.columns.length - 1;
        let item = null as React.ReactNode;
        if (typeof value === "string") {
          if (isImageUrl(value)) {
            item = (
              <List.Item.Detail.Metadata.Label
                key={idx}
                title={col.columnName || String(idx)}
                icon={{ source: value }} //
                // text={getHostname(text)}
              />
            );
          } else if (value?.startsWith("http://") || value?.startsWith("https://")) {
            item = (
              <List.Item.Detail.Metadata.Link
                key={idx}
                title={col.columnName || String(idx)}
                target={value}
                text={text}
              />
            );
          }
        }
        if (!item) {
          item = <List.Item.Detail.Metadata.Label key={idx} title={col.columnName || String(idx)} text={text} />;
        }

        return (
          <Fragment key={idx}>
            {item}
            {!isLast && <List.Item.Detail.Metadata.Separator key={`${idx}-separator`} />}
          </Fragment>
        );
      })}

      {tableInfo?.relations?.map((relation, idx) => {
        return (
          <Fragment key={`relation-${idx}`}>
            <List.Item.Detail.Metadata.Separator />
            <List.Item.Detail.Metadata.Link
              title={`${relation.foreignTable}`}
              text={relation.columnNames
                .map((col, i) => `${tableName}.${col} → ${relation.foreignTable}.${relation.foreignColumnNames[i]}`)
                .join(", ")}
              target={createDeeplink({
                extensionName: "spiceblow-database",
                context: {
                  searchText: relation.foreignColumnNames
                    .map((field, i) => {
                      const value = String(row[relation.columnNames[i]]);
                      return `${field} is ${value}`;
                    })
                    .join(" and "),
                  schemaTable: `${relation.foreignSchema}.${relation.foreignTable}`,
                  view: "search-table",
                } satisfies LaunchContext,
                type: DeeplinkType.Extension,
                command: "search-database",
              })}
            />
          </Fragment>
        );
      })}
    </List.Item.Detail.Metadata>
  );
}

function GenerateCustomQueryForm({
  existingQuery,
  revalidate,
  type,
}: {
  existingQuery?: CustomQuery;
  revalidate: () => void;
  type: CustomQueryType;
}) {
  const currentConnectionString = useGlobalState((x) => x.connectionString);
  const databaseType = getDatabaseConnectionType(currentConnectionString);
  const [prompt, setPrompt] = useState(existingQuery?.prompt || "");
  const [query, setQuery] = useState(() => {
    if (existingQuery?.query) {
      return "```\n" + existingQuery.query + "\n```";
    }
    return "";
  });
  const getDefaultSchemas = () => {
    if (existingQuery?.schemas) {
      return existingQuery.schemas;
    }
    if (databaseType === "postgres") {
      return ["public"];
    }
    return [];
  };

  const [selectedSchemas, setSelectedSchemas] = useState(getDefaultSchemas());
  const [isLoading, setIsLoading] = useState(false);
  const [tableInfo, setTableInfo] = useState<TableInfo | undefined>(existingQuery?.tableInfo);
  const [bestField, setBestField] = useState<string>(existingQuery?.bestField || "");
  const [queryDescription, setQueryDescription] = useState("");
  const schemas = useCachedPromise(
    async (_connectionString) => {
      const res = await databaseFunctions.getAllTablesInfo();
      const schemas = new Set(res.map((table) => table.schemaTable.split(".")[0]));
      return [...schemas];
    },
    [currentConnectionString],
    { keepPreviousData: false },
  );
  useEffect(() => {
    if (schemas.data?.length && selectedSchemas.length === 0) {
      setSelectedSchemas(schemas.data.slice(0, 1));
    }
  }, [schemas.data]);

  const schema = useCachedPromise(
    async (_connectionString, selectedSchemas) => {
      const schema = await databaseFunctions.getDatabaseSchema({ schemas: selectedSchemas });

      return schema;
    },
    [currentConnectionString, selectedSchemas],
    { keepPreviousData: true, execute: schemas.data != null },
  );

  const [queryHasError, setQueryHasError] = useState(false);

  function reset() {
    setQueryHasError(false);
    setQueryDescription("");
    setQuery("");

    setBestField("");
  }
  const handleGenerateQuery = async () => {
    reset();

    lastSubmittedPrompt.current = prompt;
    const previousOutputs = [] as { output: string; error: string }[];
    try {
      setIsLoading(true);

      while (previousOutputs.length <= 3) {
        if (abortController) {
          abortController.abort();
        }
        abortController = new AbortController();

        const { data, error } = await apiClient.spiceblow.api.generateSqlQuery.post({
          prompt,
          schema: schema.data!,
          type,
          previousOutputs,
          previousQuery: query
            .split("\n")
            .filter((x) => !x.includes("```"))
            .join("\n"),
          databaseType: getDatabaseConnectionType(currentConnectionString)!,
        });
        if (error) {
          throw error;
        }
        let sqlCode = "";
        for await (const chunk of data) {
          sqlCode = chunk.sqlCode;
          if (sqlCode) {
            setQuery("```\n" + sqlCode + "\n```");
          }
        }
        console.log("finished generating sql", sqlCode);

        try {
          const { fieldsCount, bestField, tableInfo } = await databaseFunctions.testGeneratedQuery(sqlCode);

          setTableInfo(tableInfo);
          setBestField(bestField);
          setQueryDescription(`${fieldsCount} fields, using '${bestField}' as primary field`);
          return;
        } catch (error) {
          previousOutputs.push({ output: sqlCode, error: String(error) });
          // console.log("error", sqlCode);
          console.log(error);
          showToast({
            title: `Sql error ${previousOutputs.length + 1}, retrying...`,
            message: String(error),

            style: Toast.Style.Failure,
          });
        }
      }
    } finally {
      setIsLoading(false);
    }
    showToast({
      title: `Sql error`,
      message: String(previousOutputs[previousOutputs.length - 1].error),
      style: Toast.Style.Failure,
    });
  };

  const { push } = useNavigation();
  const saveQuery = async () => {
    try {
      const storedQueries = JSON.parse((await LocalStorage.getItem("queries")) || "[]");
      if (!tableInfo) {
        throw new Error("Table info could not be found");
      }
      if (!bestField) {
        throw new Error("Best field could not be found");
      }
      const queryProps: CustomQuery = {
        type,
        query: query
          .split("\n")
          .filter((x) => !x.includes("```"))
          .join("\n"),
        tableInfo,
        bestField,
        prompt,
        schemas: selectedSchemas,
        connectionString: currentConnectionString,
        id: existingQuery?.id || generateRandomId(),
      };

      if (existingQuery) {
        const index = storedQueries.findIndex((q: CustomQuery) => q.id === existingQuery.id);
        if (index !== -1) {
          storedQueries[index] = queryProps;
        }
      } else {
        storedQueries.push(queryProps);
      }

      await LocalStorage.setItem("queries", JSON.stringify(storedQueries));
      putFirstInTablesOrder(queryProps.id);
      showToast({ style: Toast.Style.Success, title: "Query saved successfully" });
      await revalidate();
      push(<SearchCustomQuery {...queryProps} revalidate={revalidate} />);
    } catch (error) {
      notifyError(error);
    }
  };
  const lastSubmittedPrompt = useRef("");

  const shouldSubmit = prompt && query && prompt === lastSubmittedPrompt.current;
  const onAction = shouldSubmit ? saveQuery : handleGenerateQuery;

  if (query && shouldSubmit) {
    const actions = [
      !queryHasError && <Action key="save" title={"Save Query"} onAction={saveQuery} icon={Icon.SaveDocument} />,
      <Action
        key="edit"
        title={"Update Query"}
        onAction={() => {
          lastSubmittedPrompt.current = "";
          setPrompt((x) => x + " ");
        }}
        icon={Icon.EditShape}
      />,
    ];
    if (prompt === existingQuery?.prompt) {
      actions.reverse();
    }
    return (
      <Detail
        actions={
          <ActionPanel>
            {actions}
            <Action.CopyToClipboard title="Copy Query" content={query} />
          </ActionPanel>
        }
        isLoading={isLoading || schemas.isLoading}
        markdown={query}
      />
    );
  }

  return (
    <Form
      isLoading={schema.isLoading || isLoading || schemas.isLoading}
      actions={
        <ActionPanel>
          <Action title={!shouldSubmit ? "Generate Sql Query" : "Save Query"} onAction={onAction} />
          {!!query && <Action title={"Save Query"} onAction={saveQuery} />}
          {/* <Action.SubmitForm title="Save Query" onSubmit={handleSubmit} /> */}
        </ActionPanel>
      }
    >
      <Form.TextField
        id="prompt"
        title="AI Prompt"
        placeholder="Describe the query you want to generate"
        value={prompt}
        autoFocus
        onChange={setPrompt}
      />
      <Form.TagPicker
        info="The LLM will only use these database schemas to generate the query"
        id="schemas"
        title={
          getDatabaseConnectionType(currentConnectionString) === "mysql" ? "Databases Involved" : "Schemas Involved"
        }
        value={selectedSchemas}
        onChange={setSelectedSchemas}
      >
        {schemas.data?.map((schema) => <Form.TagPicker.Item key={schema} value={schema} title={schema} />)}
      </Form.TagPicker>
      {query && (
        <Form.TextArea
          enableMarkdown
          info="This is the Sql query generated by the AI from your prompt"
          id="generatedQuery"
          title="Generated Sql Query"
          // value={`'''\n` + query + `\n'''`}
          value={query}
          onChange={prompt ? setQuery : () => {}}
        />
      )}
      {queryDescription && <Form.Description title="" text={queryDescription || ""} />}
      {!!tableInfo && !isLoading && (
        <Form.Dropdown
          info="This is the field shown on the left part of the Raycast list"
          id="bestField"
          title="Select Primary Field"
          value={bestField}
          onChange={setBestField}
        >
          {tableInfo?.columns.map((col) => (
            <Form.Dropdown.Item key={col.columnName} title={`${col.columnName} (${col.type})`} value={col.columnName} />
          ))}
        </Form.Dropdown>
      )}
    </Form>
  );
}

function RowInfo({ tableInfo, row }: { tableInfo?: TableInfo; row: Json }) {
  const { push } = useNavigation();
  return (
    <List>
      {tableInfo?.columns.map((col, idx) => {
        const value = databaseFunctions.renderColumnValue(col, row[col.columnName]);
        return (
          <List.Item
            key={idx}
            title={col.columnName || String(idx)}
            subtitle={value}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard title="Copy Column Value" content={value} />
                <Action
                  title="View"
                  icon={Icon.Goal}
                  onAction={() => {
                    push(<RowColumnAsMarkdown value={value} />);
                  }}
                />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}

function RowColumnAsMarkdown({ value }: { value: string }) {
  return (
    <Detail
      markdown={`\`\`\`\n${value}\n\`\`\``}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy Value" content={value} />
        </ActionPanel>
      }
    />
  );
}

function ShouldRunTransactionQueries() {
  const { transactionQueries, resetTransactionQueries } = useGlobalState();
  const queriesMarkdown = getQueryMarkdown(transactionQueries);
  const markdown = `Are you sure you want to run these ${transactionQueries.length} queries?\n\n` + queriesMarkdown;
  const [isLoading, setIsLoading] = useState(false);
  const { pop } = useNavigation();
  return (
    <Detail
      markdown={markdown}
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action
            title="Run Transaction"
            onAction={async () => {
              setIsLoading(true);
              try {
                await databaseFunctions.executeQueries({ queries: transactionQueries });
                resetTransactionQueries();
                pop();
              } catch (e) {
                notifyError(e);
              } finally {
                setIsLoading(false);
              }
            }}
          />
          <Action
            title="Cancel"
            onAction={() => {
              pop();
            }}
          />
        </ActionPanel>
      }
    />
  );
}

function RunTransactionQueries() {
  const { transactionQueries, resetTransactionQueries } = useGlobalState();
  const { push } = useNavigation();
  if (!transactionQueries.length) {
    return null;
  }
  return (
    <>
      <Action
        title={`Run ${transactionQueries.length} Transaction Queries`}
        icon={Icon.Play}
        onAction={async () => {
          push(<ShouldRunTransactionQueries />);
        }}
      />
      <Action
        title={`Empty Transaction State`}
        icon={Icon.Play}
        onAction={async () => {
          resetTransactionQueries();
        }}
      />
    </>
  );
}

const orderCache = new Cache({ namespace: "items-order" });

function putFirstInTablesOrder(id: string) {
  const cachedOrder = orderCache.get("itemOrder") ? JSON.parse(orderCache.get("itemOrder")!) : [];
  const newOrder = [id, ...cachedOrder.filter((item: string) => item !== id)];
  orderCache.set("itemOrder", JSON.stringify(newOrder));
}

function SearchTables() {
  const { push } = useNavigation();
  const currentConnectionString = useGlobalState((x) => x.connectionString);
  const tables = useCachedPromise(
    async (_connectionString) => {
      const res = await databaseFunctions.getAllTablesInfo();
      return res;
    },
    [currentConnectionString],
    { keepPreviousData: true },
  );

  const savedQueries = useCachedPromise(
    async (_connectionString) => {
      const storedQueries = JSON.parse((await LocalStorage.getItem("queries")) || "[]") as CustomQuery[];
      return storedQueries.filter((query) => query.connectionString === currentConnectionString);
    },
    [currentConnectionString],
    { keepPreviousData: true },
  );

  const cachedOrder = useMemo(() => {
    return orderCache.get("itemOrder") ? JSON.parse(orderCache.get("itemOrder")!) : [];
  }, []);

  const items = [
    ...(savedQueries.data?.map((query, index) => {
      const queryColor = getStringColor(query.prompt);
      return {
        orderIndex: cachedOrder.findIndex((item: string) => item === query.id),
        node: (
          <List.Item
            key={`saved-query-${index}`}
            title={query.prompt}
            icon={{
              source: query.type === "time-series" ? Icon.LineChart : Icon.SaveDocument,
              tintColor: queryColor,
            }}
            keywords={[query.type === "time-series" ? "graph" : "custom query"]}
            accessories={[
              {
                tag: {
                  value: query.type === "time-series" ? "graph" : "custom query",
                },
              },
            ]}
            actions={
              <ActionPanel>
                <Action
                  title="Run Query"
                  icon={Icon.Play}
                  onAction={() => {
                    putFirstInTablesOrder(query.id);
                    push(
                      <SearchCustomQuery
                        {...query}
                        revalidate={() => {
                          savedQueries.revalidate();
                        }}
                      />,
                    );
                  }}
                />
                <RunTransactionQueries />
                <Action.CopyToClipboard title="Copy Query" content={query.query} />
                <Action
                  title="Update Query"
                  shortcut={{ modifiers: ["cmd"], key: "u" }}
                  icon={Icon.Pencil}
                  onAction={() => {
                    push(
                      <GenerateCustomQueryForm
                        type={query.type}
                        revalidate={() => {
                          savedQueries.revalidate();
                        }}
                        existingQuery={query}
                      />,
                    );
                  }}
                />
                <Action
                  title="Delete Query"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  shortcut={{ modifiers: ["cmd"], key: "d" }}
                  onAction={async () => {
                    const updatedQueries = savedQueries.data?.filter((_, i) => i !== index);
                    await LocalStorage.setItem("queries", JSON.stringify(updatedQueries));
                    await savedQueries.revalidate();
                    showToast(Toast.Style.Success, "Query deleted");
                  }}
                />
              </ActionPanel>
            }
          />
        ),
      };
    }) || []),
    ...(tables.data?.map((table) => {
      if (!table.schemaTable) {
        return null;
      }
      const [schema, tableName] = table.schemaTable.split(".");
      const schemaColor = getStringColor("_" + schema || "", { saturation: 0.4 });
      const tableColor = getStringColor(table.schemaTable);

      return {
        orderIndex: cachedOrder.findIndex((item: string) => item === table.schemaTable),
        node: (
          <List.Item
            key={table.schemaTable}
            title={tableName}
            // subtitle={table.columns?.map((c) => c).join(", ") || ""}
            icon={{
              source: Icon.Document,
              tintColor: tableColor,
            }}
            keywords={[schema, ...(table.columns || [])]}
            accessories={[
              {
                tag: { value: schema, color: schemaColor },
              },
            ]}
            actions={
              <ActionPanel>
                <Action
                  title="View Rows"
                  onAction={() => {
                    putFirstInTablesOrder(table.schemaTable);
                    push(<SearchTable table={table.schemaTable} />);
                  }}
                />
                <RunTransactionQueries />
              </ActionPanel>
            }
          />
        ),
      };
    }) || []),
  ];

  const sortedItems = items
    .filter((item): item is { orderIndex: number; node: JSX.Element } => item !== null)
    .sort((a, b) => {
      if (a.orderIndex === -1 && b.orderIndex === -1) return 0;
      if (a.orderIndex === -1) return 1;
      if (b.orderIndex === -1) return -1;
      return a.orderIndex - b.orderIndex;
    })
    .map((item) => item.node);

  return (
    <List actions={<RunTransactionQueries />} searchBarAccessory={<DatabasesDropdown />} isLoading={tables.isLoading}>
      <List.Item
        key="add-new-query"
        title="Add New Query"
        subtitle={"Generate a list for a custom Sql query"}
        icon={Icon.NewDocument}
        actions={
          <ActionPanel>
            <Action
              title="Add"
              onAction={() => {
                push(
                  <GenerateCustomQueryForm
                    type="list"
                    revalidate={() => {
                      savedQueries.revalidate();
                      tables.revalidate();
                    }}
                  />,
                );
              }}
            />
            <RunTransactionQueries />
          </ActionPanel>
        }
      />
      <List.Item
        key="add-new-graph"
        title="Add New Graph"
        subtitle={"Generate a bar chart for an Sql query"}
        icon={Icon.LineChart}
        actions={
          <ActionPanel>
            <Action
              title="Add"
              onAction={() => {
                push(
                  <GenerateCustomQueryForm
                    type="time-series"
                    revalidate={() => {
                      savedQueries.revalidate();
                      tables.revalidate();
                    }}
                  />,
                );
              }}
            />
            <RunTransactionQueries />
          </ActionPanel>
        }
      />
      {sortedItems}
    </List>
  );
}

interface NewDatabaseValues {
  name: string;
  connectionString: string;
}

function AddDatabase({ existingDatabase, revalidate }: { existingDatabase?: StoredDatabase; revalidate: () => void }) {
  const { push } = useNavigation();
  const { setConnectionString } = useGlobalState();
  const [isLoading, setIsLoading] = useState(false);

  const { handleSubmit, itemProps } = useForm<NewDatabaseValues>({
    initialValues: {
      name: existingDatabase?.name || draftValues?.name || "",
      connectionString: existingDatabase?.connectionString || draftValues?.connectionString || "",
    },
    async onSubmit(values) {
      setIsLoading(true);
      const connectionUri = databaseFunctions.fixDatabaseUri(values.connectionString);
      try {
        const connectionOk = await databaseFunctions.checkConnection(
          connectionUri,
          getDatabaseConnectionType(connectionUri)!,
        );
        if (!connectionOk) {
          throw new Error("Connection failed");
        }
        const dbs: StoredDatabase[] = JSON.parse((await LocalStorage.getItem("databases")) || "[]");
        const existingIndex = dbs.findIndex((db) => db.connectionString === connectionUri);
        if (existingIndex !== -1) {
          dbs[existingIndex] = { connectionString: connectionUri, name: values.name };
        } else {
          dbs.push({ connectionString: connectionUri, name: values.name });
        }
        await LocalStorage.setItem("databases", JSON.stringify(dbs));
        showToast({
          style: Toast.Style.Success,
          title: existingIndex !== -1 ? "Database updated successfully" : "Database added successfully",
        });
        setConnectionString(connectionUri);
        await revalidate();
        push(<SearchTables />);
      } catch (error) {
        notifyError(error);
      } finally {
        setIsLoading(false);
      }
    },
    validation: {
      name: FormValidation.Required,
      connectionString: (value = "") => {
        if (!value) {
          return "Connection string cannot be empty";
        }
        if (!isValidUrl(value)) {
          return "Invalid URL";
        }
        const dbType = getDatabaseConnectionType(value);
        if (!dbType) {
          return "Database type not supported";
        }
      },
    },
  });

  return (
    <Form
      isLoading={isLoading}
      enableDrafts
      actions={
        <ActionPanel>
          <Action.SubmitForm title={existingDatabase ? "Update Database" : "Add Database"} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField {...itemProps.name} title="Database Name" placeholder="Enter a name for the database" />
      <Form.TextField
        {...itemProps.connectionString}
        title="Connection String"
        info="The database connection string, supports Postgres and Mysql"
        placeholder="postgresql://user:password@localhost:5432/database"
      />
      <Form.Description title="" text="The database url will be saved locally in Raycast encrypted storage" />
    </Form>
  );
}

function useDatabases() {
  const databases = useCachedPromise(
    async () => {
      const storedDatabases = JSON.parse((await LocalStorage.getItem("databases")) || "[]");
      return storedDatabases as StoredDatabase[];
    },
    [],
    { keepPreviousData: true },
  );

  return databases;
}

function DeleteRows({ revalidate, deleteQueries }: { revalidate: () => void; deleteQueries: SQLStatement[] }) {
  const { pop } = useNavigation();
  const [isLoading, setIsLoading] = useState(false);
  const { addQueriesToTransaction } = useGlobalState();
  const queriesMarkdown = getQueryMarkdown(deleteQueries);
  const markdown = "Are you sure you want to execute the following queries?\n\n" + queriesMarkdown;

  async function executeDeleteQuery() {
    try {
      setIsLoading(true);
      await databaseFunctions.executeQueries({ queries: deleteQueries });
      await revalidate();
      showToast({ title: "Deleted successfully", style: Toast.Style.Success });
      pop();
    } catch (error) {
      notifyError(error);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Detail
      isLoading={isLoading}
      navigationTitle="Delete Rows?"
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action title="Delete" onAction={executeDeleteQuery} icon={Icon.Trash} style={Action.Style.Destructive} />
          <Action
            title="Add to Transaction"
            onAction={() => {
              addQueriesToTransaction(...deleteQueries);
              pop();
            }}
          />
          <Action title="Cancel" onAction={pop} />
        </ActionPanel>
      }
    />
  );
}

function EditRow({
  tableInfo,
  revalidate,
  row,
  type,
}: {
  tableInfo?: TableInfo;
  row?: Record<string, Json>;
  revalidate: () => void;
  type: "edit" | "duplicate" | "insert";
}) {
  const { addQueriesToTransaction } = useGlobalState();
  const [formValues, setFormValues] = useState<Record<string, Json>>(() => {
    if (row && type === "duplicate") {
      const duplicatedRow = { ...row };

      tableInfo?.columns.forEach((column) => {
        if (column.isPrimaryKey && column.defaultValue !== null) {
          delete duplicatedRow[column.columnName];
        }
      });

      return duplicatedRow;
    }
    return row || {};
  });
  const [changedColumns, setChangedFields] = useState<Set<string>>(new Set());
  const { pop } = useNavigation();
  const requiredFields = tableInfo?.columns.filter((x) => x.isNullable === false && !x.defaultValue) || [];
  const allValues = Object.entries(formValues).map(([columnName, value]) => {
    const info = tableInfo?.columns?.find((x) => x.columnName === columnName);
    if (!info) {
      return null;
    }

    return { ...info, value, oldValue: row?.[columnName] };
  });
  const args: databaseFunctions.TableRowUpdateParams = {
    updateColumns: [...changedColumns],
    allValues: allValues.filter(isTruthy) || [],
  };
  const [isLoading, setIsLoading] = useState(false);
  const handleSubmit = async () => {
    try {
      setIsLoading(true);
      if (!changedColumns.size) {
        throw new Error("No fields changed");
      }
      switch (type) {
        case "insert":
        case "duplicate": {
          const { insertQueries } = await databaseFunctions.prepareTableRowInsert(args);
          setQueries(insertQueries);
          break;
        }
        case "edit": {
          const { updateQueries } = await databaseFunctions.prepareTableRowUpdate(args);
          setQueries(updateQueries);
          break;
        }
      }
    } catch (error) {
      notifyError(error);
    } finally {
      setIsLoading(false);
    }
  };

  async function executeQuery() {
    try {
      setIsLoading(true);
      await databaseFunctions.executeQueries({ queries });
      await revalidate();
      showToast({ title: "Executed queries successfully", style: Toast.Style.Success });
    } finally {
      setIsLoading(false);
    }
    pop();
  }

  const handleFieldChange = (fieldName: string, newValue: string | null) => {
    if (!tableInfo) {
      return;
    }
    const col = tableInfo.columns.find((x) => x.columnName === fieldName)!;

    if (newValue !== renderColumnValue(col, row?.[fieldName])) {
      setChangedFields((prev) => new Set(prev).add(fieldName));
    } else {
      setChangedFields((prev) => {
        const newSet = new Set(prev);
        newSet.delete(fieldName);
        return newSet;
      });
    }
    const notRequired = col.isNullable || col.defaultValue;
    if (newValue === "" && notRequired) {
      newValue = null;
    }
    setFormValues((prev) => ({ ...prev, [fieldName]: newValue }));
  };

  const [queries, setQueries] = useState<SQLStatement[]>([]);

  const markdown = `Do you want to execute the following queries?\n\n` + getQueryMarkdown(queries);

  const title = (() => {
    switch (type) {
      case "edit":
        return "Update Row";
      case "duplicate":
        return "Duplicate Row";
      case "insert":
        return "Insert Row";
    }
  })();

  if (queries?.length) {
    return (
      <Detail
        isLoading={isLoading}
        navigationTitle={title}
        markdown={markdown}
        actions={
          <ActionPanel>
            <Action title="Execute Query" onAction={() => executeQuery()} />
            <Action
              title="Add to Transaction"
              onAction={() => {
                addQueriesToTransaction(...queries);
                pop();
              }}
            />
            <Action shortcut={{ modifiers: ["cmd"], key: "d" }} title="Cancel" onAction={pop} />
          </ActionPanel>
        }
      />
    );
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title={title} onSubmit={handleSubmit} />
          <Action
            title="Add to Transaction"
            onAction={() => {
              addQueriesToTransaction(...queries);
              pop();
            }}
          />
        </ActionPanel>
      }
    >
      {tableInfo?.columns.map((column) => {
        const canBeUpdated = column.originalColumnName && column.tableName;
        const value = renderColumnValue(column, formValues[column.columnName]);

        let FormComponent = Form.TextField;
        if (value.split("\n").length > 1) {
          FormComponent = Form.TextArea;
        }

        let error = "";
        if (requiredFields.includes(column)) {
          if (!value) {
            error = "This field is required";
          }
        }
        const isUpdating = changedColumns.has(column.columnName);
        if (isUpdating && !canBeUpdated) {
          error = `This field cannot be updated because it has no table information`;
        }

        let info = "";
        if (isUpdating) {
          info = `will update column "${column.originalColumnName}" in table "${column.tableName}"`;
        }
        let placeholder = `Enter ${column.originalColumnName}`;
        if (!requiredFields.includes(column)) {
          const col = tableInfo.columns.find((x) => x.columnName === column.columnName);
          if (col?.defaultValue) {
            placeholder = col?.defaultValue;
          } else {
            placeholder = `null`;
          }
        }

        if (column.enumValues?.length) {
          // console.log('column.enumValues', column.enumValues);
          return (
            <Form.Dropdown
              key={column.columnName}
              id={column.columnName}
              error={error}
              title={column.columnName}
              info={info}
              defaultValue={value || ""}
              onChange={(newValue) => handleFieldChange(column.columnName, newValue)}
            >
              {column.isNullable && <Form.Dropdown.Item key="null" value="" title="null" />}
              {column.enumValues?.map((enumValue) => (
                <Form.Dropdown.Item key={enumValue} value={enumValue} title={enumValue} />
              ))}
            </Form.Dropdown>
          );
        }

        return (
          <FormComponent
            key={column.columnName}
            id={column.columnName}
            error={error}
            title={column.columnName}
            info={info}
            placeholder={placeholder}
            defaultValue={value || ""}
            onChange={(newValue) => handleFieldChange(column.columnName, newValue)}
          />
        );
      })}
    </Form>
  );
}

function DatabasesDropdown() {
  const databases = useDatabases();
  const { push } = useNavigation();
  const { setConnectionString, connectionString } = useGlobalState();
  const ADD_NEW_DATABASE = "add-new-database_";
  const MANAGE_DATABASES = "manage-databases_";

  if (!connectionString) {
    return null;
  }
  if (databases.isLoading) {
    return null;
  }

  return (
    <List.Dropdown
      tooltip="Select Database"
      value={connectionString}
      storeValue={false}
      onChange={(newValue) => {
        if (newValue === ADD_NEW_DATABASE) {
          push(
            <AddDatabase
              revalidate={() => {
                databases.revalidate();
              }}
            />,
          );
          return;
        }
        if (newValue === MANAGE_DATABASES) {
          push(
            <ManageDatabases
              revalidate={() => {
                databases.revalidate();
              }}
            />,
          );
          return;
        }

        setConnectionString(newValue);
      }}
    >
      {databases.data?.map((db, index) => {
        return (
          <List.Dropdown.Item
            key={index}
            title={db.name || `Database ${index + 1}`}
            value={db.connectionString}
            icon={getAvatarIcon(db.name, { gradient: false })}
          />
        );
      })}
      <List.Dropdown.Item title="Add New Database" value={ADD_NEW_DATABASE} />
      <List.Dropdown.Item title="Manage Databases" value={MANAGE_DATABASES} />
    </List.Dropdown>
  );
}

function ManageDatabases({ revalidate }: { revalidate: () => void }) {
  const { push, pop } = useNavigation();
  const databases = useDatabases();
  const state = useGlobalState();
  const { connectionString, setConnectionString } = useGlobalState();
  return (
    <List isLoading={databases.isLoading}>
      {databases.data?.map((db, index) => (
        <List.Item
          key={index}
          title={db.name || `Database ${index + 1}`}
          icon={getAvatarIcon(db.name, { gradient: false })}
          subtitle={hideSensitiveDataFromUrl(db.connectionString)}
          actions={
            <ActionPanel>
              <Action
                title="Update Database"
                onAction={() => {
                  state.setConnectionString(db.connectionString);
                  push(
                    <AddDatabase
                      revalidate={() => {
                        databases.revalidate();
                      }}
                      existingDatabase={db}
                    />,
                  );
                }}
              />
              <Action
                title="Delete Database"
                style={Action.Style.Destructive}
                shortcut={{ modifiers: ["cmd"], key: "d" }}
                onAction={async () => {
                  const storedDatabases: StoredDatabase[] = JSON.parse(
                    (await LocalStorage.getItem("databases")) || "[]",
                  );
                  if (connectionString === db.connectionString) {
                    setConnectionString("");
                  }
                  const updatedDatabases = storedDatabases.filter((x) => x.connectionString !== db.connectionString);
                  await LocalStorage.setItem("databases", JSON.stringify(updatedDatabases));
                  await databases.revalidate();
                  await revalidate();
                  pop();
                }}
              />
            </ActionPanel>
          }
        />
      ))}
      <List.Item
        key="add-database"
        title="Add Database"
        icon={Icon.PlusCircleFilled}
        actions={
          <ActionPanel>
            <Action
              title="Add Database"
              onAction={() => {
                push(
                  <AddDatabase
                    revalidate={() => {
                      databases.revalidate();
                    }}
                  />,
                  () => {
                    databases.revalidate();
                  },
                );
              }}
            />
          </ActionPanel>
        }
      />
    </List>
  );
}

export const NATURAL_LANGUAGE_SEARCH = "NATURAL_LANGUAGE_SEARCH";

function useTableFiltering({ tableInfo }: { tableInfo?: TableInfo }) {
  const [searchField, setSearchField] = useState(NATURAL_LANGUAGE_SEARCH);
  const dropdown = (
    <List.Dropdown filtering storeValue tooltip="Select Field" onChange={setSearchField}>
      <List.Dropdown.Item title="Natural Language Search" value={NATURAL_LANGUAGE_SEARCH} />
      <List.Dropdown.Item title="Search All Fields" value="" />

      {tableInfo?.columns
        .filter((x) => databaseFunctions.isSearchableColumn(x))
        .map((col) => (
          <List.Dropdown.Item key={col.columnName} title={`Search "${col.columnName}"`} value={col.columnName} />
        ))}
    </List.Dropdown>
  );
  let searchPlaceholder = "Search rows...";
  if (searchField === NATURAL_LANGUAGE_SEARCH) {
    searchPlaceholder = "name contains tommy...";
  }

  return { searchField, dropdown, setSearchField, searchPlaceholder };
}

let draftValues: NewDatabaseValues | undefined;

const Command = ({ draftValues: draftValuesArg }: LaunchProps<{ draftValues?: NewDatabaseValues }>) => {
  draftValues = draftValuesArg;
  const { connectionString, setConnectionString } = useGlobalState();
  const databases = useDatabases();

  const licenseInfo = usePromise(async () => {
    const { data, error } = await apiClient.spiceblow.api.checkLicense.post();
    if (error) {
      throw error;
    }
    const reqCount = await getRequestsCount();
    const hasLicense = data.hasLicense;
    const availableRequests = freeRequestsCount - reqCount;
    if (!hasLicense) {
      console.log(`Available requests: ${availableRequests}`);
    }
    const needsLicense = !hasLicense && availableRequests <= 0;

    return { hasLicense, needsLicense };
  });

  const firstConnectionString = databases?.data?.find((x) => x.connectionString)?.connectionString;
  if (!connectionString && firstConnectionString) {
    setConnectionString(firstConnectionString);
  }

  if (licenseInfo?.data?.needsLicense) {
    return <BuyLicense />;
  }

  if (databases?.data && databases?.data?.length === 0) {
    return (
      <AddDatabase
        revalidate={() => {
          return databases.revalidate();
        }}
      />
    );
  }

  if (!connectionString) {
    return <List isLoading={true} />;
  }

  if (launchContext?.view === "search-table") {
    return <SearchTable table={launchContext.schemaTable} />;
  }

  return <SearchTables key={connectionString} />;
};

export default withAccessToken(google)(Command);
