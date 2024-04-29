import { Action, ActionPanel, PopToRootType, Toast, showHUD, showToast } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { preferences } from "./helpers/preferences";
import { Form } from "@raycast/api";
import { LocalStorage } from "@raycast/api";
import { datasourcesSchema } from "./datasource/datasource.schema";
import { useState } from "react";

type FormValues = {
  query: string;
  datasource: string;
  name?: string;
};

export type QueryCacheEntry = {
  query: string;
  name?: string;
  datasource: {
    uid: string;
    name: string;
    type: string;
    typeLogoUrl: string;
  };
};

async function handleSubmit(values: FormValues) {
  try {
    const random = Math.random().toString(36).substring(7);
    const datasource = JSON.parse(values.datasource) as QueryCacheEntry["datasource"];
    await LocalStorage.setItem(
      `query::${random}`,
      JSON.stringify({
        query: values.query,
        name: values.name,
        datasource,
      }),
    );
    await showHUD(`Saved successfully ✅`, { clearRootSearch: true, popToRootType: PopToRootType.Immediate });
  } catch (e) {
    console.error(e);
    await showToast(Toast.Style.Failure, `Error!`, `There was an error saving your saved search`);
  }
}

export default function Command() {
  // https://grafana.com/docs/grafana-cloud/developer-resources/api-reference/http-api/data_source/
  // This API currently doesn’t handle pagination. The default maximum number of data sources returned is 5000. You can change this value in the default.ini file.
  const [queryFieldError, setQueryFieldError] = useState<string | undefined>();
  const [datasourcesFieldError, setDatasourcesFieldError] = useState<string | undefined>();

  const { data: datasources } = useFetch(`${preferences.rootApiUrl}/api/datasources`, {
    parseResponse,
    // to make sure the screen isn't flickering when the searchText changes
    keepPreviousData: true,
    method: "get",
    headers: {
      "Content-Type": "application/json",
      accept: "application/json",
      Authorization: `Bearer ${preferences.apikey}`,
    },
    onError: async (error) => {
      console.error(error);
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to fetch datasources",
      });
      setDatasourcesFieldError("Failed to fetch datasources");
    },
  });

  const dropQueryFieldErrorIfNeeded = () => {
    if (queryFieldError && queryFieldError.length > 0) {
      setQueryFieldError(undefined);
    }
  };

  const dropDatasourcesFieldErrorIfNeeded = () => {
    if (datasourcesFieldError && datasourcesFieldError.length > 0) {
      setDatasourcesFieldError(undefined);
    }
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Saved Search" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="query"
        title="Query"
        placeholder="Your QL query"
        error={queryFieldError}
        onChange={dropQueryFieldErrorIfNeeded}
        onBlur={(event) => {
          if (event.target.value?.length == 0) {
            setQueryFieldError("The field should't be empty!");
          } else {
            dropQueryFieldErrorIfNeeded();
          }
        }}
      />
      <Form.TextField id="name" title="Name (Optional)" placeholder="Optional name" />
      <Form.Dropdown
        id="datasource"
        title="Datasource"
        error={datasourcesFieldError}
        onChange={dropDatasourcesFieldErrorIfNeeded}
        onBlur={(event) => {
          console.log(event.target.value);
          if (!event.target.value) {
            setDatasourcesFieldError("The field should't be empty!");
          } else {
            dropDatasourcesFieldErrorIfNeeded();
          }
        }}
      >
        {(datasources || [])
          .sort((a, b) => (a.type < b.type ? 1 : -1))
          .map((datasource) => (
            <Form.Dropdown.Item
              key={datasource.uid}
              value={JSON.stringify({
                uid: datasource.uid,
                name: datasource.name,
                type: datasource.type,
                typeLogoUrl: datasource.typeLogoUrl,
              })}
              title={datasource.name}
              icon={`${preferences.rootApiUrl}/${datasource.typeLogoUrl}`}
            />
          ))}
      </Form.Dropdown>
    </Form>
  );
}

async function parseResponse(response: Response) {
  type Json = Record<string, unknown>;
  const json = (await response.json()) as Json[] | { code: string; message: string };

  if (!response.ok || "message" in json) {
    throw new Error("message" in json ? json.message : response.statusText);
  }

  const datasources = datasourcesSchema.parse(json);
  return datasources.filter((datasource) => datasource.type === "prometheus" || datasource.type === "loki");
}
