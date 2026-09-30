import {
  List,
  Action,
  ActionPanel,
  Icon,
  Color,
  confirmAlert,
  Alert,
  showToast,
  Toast,
  Clipboard,
  showHUD,
} from "@raycast/api";

import { listTables, runQuery, useDatabaseUsages, useDatabases } from "./hooks";
import { useEffect, useState } from "react";
import { Database, Table, createDatabaseToken, deleteDatabase } from "./utils/api";
import { Row } from "@libsql/client/web";
import CreateDatabaseView from "./create-database";

export default function DatabaseList() {
  const { data: databases, isLoading, revalidate: refreshDatabases } = useDatabases();
  const { data: usages, revalidate } = useDatabaseUsages();

  const onSelectionChange = async (id: string | null) => {
    if (id === null) return;

    const [organizationName, dbName] = id.split("___");
    revalidate(organizationName, dbName);
  };

  return (
    <List isLoading={isLoading} isShowingDetail={true} onSelectionChange={onSelectionChange}>
      <List.Item
        title="Create a new database..."
        icon={Icon.PlusCircle}
        actions={
          <ActionPanel>
            <Action.Push title="Create New Database" icon={Icon.PlusCircle} target={<CreateDatabaseView />} />
          </ActionPanel>
        }
      />
      {Object.keys(databases).map((organizationName) => (
        <List.Section title={organizationName} key={organizationName}>
          {databases[organizationName].map((db) => (
            <List.Item
              id={`${organizationName}___${db.Name}`}
              key={db.DbId}
              title={db.Name}
              accessories={[{ tag: db.group ?? "" }]}
              icon={{
                source: "icons/database.png",
                tintColor: "white",
              }}
              detail={
                <List.Item.Detail
                  metadata={
                    <List.Item.Detail.Metadata>
                      <List.Item.Detail.Metadata.Label title="Id" text={db.DbId} />
                      <List.Item.Detail.Metadata.Label title="Name" text={db.Name} />
                      <List.Item.Detail.Metadata.Label title="Hostname" text={db.Hostname} />
                      <List.Item.Detail.Metadata.Label title="Group" text={db.group} />
                      <List.Item.Detail.Metadata.Label title="Regions" text={db.regions.join(", ")} />
                      <List.Item.Detail.Metadata.Label title="Primary Region" text={db.primaryRegion} />
                      <List.Item.Detail.Metadata.Label title="Type" text={db.type} />
                      <List.Item.Detail.Metadata.Label title="Version" text={db.version} />
                      <List.Item.Detail.Metadata.Label title="Sleeping" text={db.sleeping.toString()} />
                      <List.Item.Detail.Metadata.Separator />
                      <List.Item.Detail.Metadata.Label title="Usage" icon={Icon.LineChart} />
                      <List.Item.Detail.Metadata.Label
                        title="Total rows read"
                        text={usages[db.Name]?.total.rows_read.toString() || "-"}
                      />
                      <List.Item.Detail.Metadata.Label
                        title="Total rows written"
                        text={usages[db.Name]?.total.rows_written.toString() || "-"}
                      />
                      <List.Item.Detail.Metadata.Label
                        title="Total storage_bytes"
                        text={usages[db.Name]?.total.storage_bytes.toString() || "-"}
                      />
                    </List.Item.Detail.Metadata>
                  }
                />
              }
              actions={
                <ActionPanel>
                  <Action.Push
                    title="Open Database"
                    icon={{ source: "icons/database.png", tintColor: Color.PrimaryText }}
                    target={<DatabaseView database={db} />}
                  />
                  <Action.CopyToClipboard
                    title={"Copy Connection URL"}
                    key="clipboard"
                    content={`libsql://${db.Hostname}`}
                  />
                  <Action
                    title="Create New Token"
                    icon={Icon.Key}
                    onAction={async () => {
                      const jwt = await createDatabaseToken(organizationName, db.Name);
                      await Clipboard.copy(jwt);
                      await showHUD("Token copied to clipboard");
                    }}
                  />
                  <Action
                    title="Delete Database"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    onAction={async () => {
                      await confirmAlert({
                        icon: { source: Icon.Warning, tintColor: Color.Red },
                        title: "Delete this database ?",
                        message: "All data will be lost",
                        primaryAction: {
                          title: "Delete",
                          style: Alert.ActionStyle.Destructive,
                          onAction: async () => {
                            const toast = await showToast({
                              title: "Deleting database...",
                              style: Toast.Style.Animated,
                            });
                            await deleteDatabase(organizationName, db.Name);
                            toast.style = Toast.Style.Success;
                            toast.title = "Database deleted";
                            refreshDatabases();
                          },
                        },
                      });
                    }}
                  />
                </ActionPanel>
              }
            ></List.Item>
          ))}
        </List.Section>
      ))}
    </List>
  );
}

function DatabaseView(props: { database: Database }) {
  const [tables, setTables] = useState<Table[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setIsLoading(true);
    listTables(props.database).then((res) => {
      setTables(res);
      setIsLoading(false);
    });
  }, []);

  return (
    <List isLoading={isLoading} isShowingDetail={true}>
      {tables.map((table) => (
        <List.Item
          key={table.tbl_name}
          title={table.tbl_name}
          icon={{ source: "icons/sheet.png", tintColor: Color.PrimaryText }}
          actions={
            <ActionPanel>
              <Action.Push
                title="Open Table"
                icon={{ source: "icons/sheet.png", tintColor: Color.PrimaryText }}
                target={<TableView database={props.database} table={table} />}
              />
              <Action.CopyToClipboard title={"Copy SQL to Clipboard"} key="clipboard" content={table.sql} />
            </ActionPanel>
          }
          detail={<List.Item.Detail markdown={sqlMarkdown(table.sql)} />}
        ></List.Item>
      ))}
    </List>
  );
}

function sqlMarkdown(sql: string) {
  return `\`\`\`sql\n${sql}\n\`\`\``;
}

function jsonMarkdown(json: Record<string, unknown>) {
  return `\`\`\`json\n${JSON.stringify(json, null, 2)}\n\`\`\``;
}

function TableView(props: { database: Database; table: Table }) {
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [columns, setColumns] = useState<ColumnInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchText, setSearchText] = useState("");
  const [showingDetail, setShowingDetail] = useState(true);

  const filter = async () => {
    setIsLoading(true);
    let _columns: ColumnInfo[] = columns;

    if (_columns.length === 0) {
      const columnsinfo = await runQuery(props.database, `pragma table_info(${props.table.tbl_name})`);
      _columns = columnsinfo as unknown as ColumnInfo[];
      setColumns(_columns);
    }
    const where = _columns.map((row: ColumnInfo) => `${row.name} like '%${searchText}%'`).join(" OR ");
    const res = await runQuery<Row[]>(props.database, `select * from ${props.table.tbl_name} where ${where} LIMIT 10`);
    setRows(res);
    setIsLoading(false);
  };

  useEffect(() => {
    filter();
  }, [searchText]);

  return (
    <List
      isLoading={isLoading}
      filtering={false}
      onSearchTextChange={setSearchText}
      isShowingDetail={showingDetail}
      throttle={true}
    >
      {rows.map((row, i) => (
        <List.Item
          key={i}
          title={""}
          subtitle={Object.values(row).join("|")}
          detail={<List.Item.Detail markdown={jsonMarkdown(row)} />}
          actions={
            <ActionPanel>
              <Action.CopyToClipboard
                title={"Copy Object to Clipboard"}
                key="clipboard"
                content={JSON.stringify(row, null, 2)}
              />
              <Action title={"Toggle Details"} onAction={() => setShowingDetail(!showingDetail)} />
            </ActionPanel>
          }
        ></List.Item>
      ))}
    </List>
  );
}

type ColumnInfo = {
  cid: number;
  name: string;
  type: string;
  notnull: number;
  dflt_value: string;
  pk: number;
};
