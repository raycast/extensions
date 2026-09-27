import { Action, ActionPanel, Alert, Form, Icon, Toast, confirmAlert, showToast, useNavigation } from "@raycast/api";
import { useEffect, useState } from "react";
import { runQuery } from "./lib/client";
import { getActiveConnection, listConnections, type Connection } from "./lib/connections";
import { describeError, summarizeWrite } from "./lib/format";
import { recordHistory } from "./lib/history";
import { isReadOnly } from "./lib/sql";
import { NoConnection } from "./views/no-connection";
import { ResultView } from "./views/result-view";

export default function RunQuery({ draftSql }: { draftSql?: string }) {
  const { push } = useNavigation();
  const [connections, setConnections] = useState<Connection[] | undefined>();
  const [connectionId, setConnectionId] = useState<string>();
  const [sql, setSql] = useState(draftSql ?? "");
  const [isRunning, setIsRunning] = useState(false);

  useEffect(() => {
    (async () => {
      const saved = await listConnections();
      const active = await getActiveConnection();
      // The preferences fallback is not in the saved list, so add it to keep it selectable.
      const all = saved.length > 0 ? saved : active ? [active] : [];
      setConnections(all);
      setConnectionId(active?.id ?? all[0]?.id);
    })();
  }, []);

  if (connections === undefined) return <Form isLoading />;
  if (connections.length === 0) return <NoConnection />;

  async function submit() {
    const connection = connections?.find((c) => c.id === connectionId);
    if (!connection || sql.trim().length === 0) return;

    if (
      !isReadOnly(sql) &&
      !(await confirmAlert({
        title: "Run a statement that can change data?",
        message: `This is not a read-only statement. It runs against ${connection.name} (${connection.host}/${connection.database}).`,
        primaryAction: { title: "Run", style: Alert.ActionStyle.Destructive },
      }))
    ) {
      return;
    }

    setIsRunning(true);
    const toast = await showToast({ style: Toast.Style.Animated, title: "Running query" });
    try {
      const result = await runQuery(connection, sql, { readOnly: isReadOnly(sql) });
      const outcome = summarizeWrite(result.command, result.rowCount);
      await recordHistory({
        sql,
        connectionName: connection.name,
        durationMs: result.durationMs,
        outcome,
        succeeded: true,
      });
      toast.style = Toast.Style.Success;
      toast.title = outcome;
      toast.message = `${result.durationMs} ms`;
      push(<ResultView result={result} sql={sql} connectionName={connection.name} />);
    } catch (error) {
      const message = describeError(error);
      await recordHistory({ sql, connectionName: connection.name, durationMs: 0, outcome: message, succeeded: false });
      toast.style = Toast.Style.Failure;
      toast.title = "Query failed";
      toast.message = message;
    } finally {
      setIsRunning(false);
    }
  }

  return (
    <Form
      isLoading={isRunning}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Run Query" icon={Icon.Play} onSubmit={submit} />
        </ActionPanel>
      }
    >
      <Form.Dropdown id="connection" title="Connection" value={connectionId} onChange={setConnectionId}>
        {connections.map((connection) => (
          <Form.Dropdown.Item
            key={connection.id}
            value={connection.id}
            title={`${connection.name} — ${connection.host}/${connection.database}`}
            icon={Icon.HardDrive}
          />
        ))}
      </Form.Dropdown>
      <Form.TextArea
        id="sql"
        title="SQL"
        placeholder="SELECT id, email FROM users ORDER BY created_at DESC LIMIT 10"
        value={sql}
        onChange={setSql}
        enableMarkdown={false}
      />
      <Form.Description
        title=""
        text={
          sql.trim().length === 0
            ? "Read-only statements run inside a READ ONLY transaction. Anything else asks before it runs."
            : isReadOnly(sql)
              ? "Read-only — runs inside a READ ONLY transaction."
              : "Not read-only — you will be asked to confirm."
        }
      />
    </Form>
  );
}
