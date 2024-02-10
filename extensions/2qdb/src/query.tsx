/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  Action,
  ActionPanel,
  Form,
  Icon,
  List,
  Toast,
  showToast,
  useNavigation,
} from "@raycast/api";
import { useEffect, useMemo, useState } from "react";
import { createPool, query } from "./db";
import { IConfigDB } from "./interface";
import { generateUUID, getDefaultConfig } from "./util";
import ResultQuery from "./components/ResultQuery";
import { LOCAL_STORAGE_TYPE } from "./constants";
import { useHistory } from "./hooks/useHistory";
import ConnectDatabase from "./connect-database";

export default function Query(params: {
  config: IConfigDB;
  initQueryString?: string;
}) {
  const { push } = useNavigation();
  const history = useHistory();

  const [sqlError, setSQLError] = useState<string | undefined>();

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [defaultConfig, setDefaultConfig] = useState<IConfigDB | null>();

  useEffect(() => {
    (async () => {
      setIsLoading(true);
      setDefaultConfig(await getDefaultConfig(LOCAL_STORAGE_TYPE.CONFIG_DATA));
    })();

    setIsLoading(false);
  }, []);

  const config: any = useMemo(() => {
    return params?.config || defaultConfig;
  }, [defaultConfig, params?.config]);

  const queryString = (queryStr: any) => {
    if (queryStr.length == 0) {
      showToast({
        style: Toast.Style.Failure,
        title: `Input sql to execute`,
      });

      return;
    }

    setIsLoading(true);
    const pool = createPool(config);

    (async () => {
      try {
        const { executionTime, result, totalRecord } = await query({
          pool,
          sql: queryStr.query,
          currentPage: 1,
        });

        showToast({
          style: Toast.Style.Success,
          title: `Time: ${executionTime} ms, Total: ${totalRecord}`,
        });

        history.add({
          configID: config.id,
          createdAt: new Date().toISOString(),
          id: generateUUID(),
          query: queryStr.query,
          result: result,
        });

        push(
          <ResultQuery
            config={config}
            queryString={queryStr.query}
            result={result}
            total={totalRecord}
          />
        );
      } catch (error: any) {
        if (error instanceof AggregateError) {
          console.error("Individual error:", error);
        } else {
          showToast({
            style: Toast.Style.Failure,
            title: `Error executing query: ${error}`,
          });
          console.error("Error executing query:", error);
        }
      } finally {
        setIsLoading(false);
        await pool.end(); // Close the pool when done
      }
    })();
  };

  const droSQLErrorIfNeeded = () => {
    if (sqlError && sqlError.length > 0) {
      setSQLError(undefined);
    }
  };

  return (
    <>
      {!defaultConfig ? (
        <List>
          <List.EmptyView
            title="No connection database"
            description="Create connection data config to start query"
            icon={Icon.Stars}
            actions={
              <ActionPanel>
                <Action.Push
                  icon={Icon.Cog}
                  title="Create Connection"
                  shortcut={{ modifiers: ["cmd"], key: "n" }}
                  target={<ConnectDatabase />}
                />
              </ActionPanel>
            }
          />
        </List>
      ) : null}

      {defaultConfig ? (
        <Form
          navigationTitle={`Database: ${config.database}  Env: ${config.env}`}
          isLoading={isLoading}
          actions={
            <ActionPanel>
              <Action.SubmitForm title="Run" onSubmit={queryString} />
            </ActionPanel>
          }
        >
          <Form.TextArea
            storeValue
            id="query"
            defaultValue={params?.initQueryString || undefined}
            title="SQL"
            placeholder="Enter query"
            error={sqlError}
            onBlur={event => {
              if (event.target.value?.length == 0) {
                setSQLError("The field should't be empty!");
              } else {
                droSQLErrorIfNeeded();
              }
            }}
          />
        </Form>
      ) : null}
    </>
  );
}
