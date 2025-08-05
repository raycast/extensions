import { showToast, Toast, List, Icon, ActionPanel, Action, Color, confirmAlert, Alert } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useState } from "react";
import { BASE_URL } from "../lib/constants";
import { ErrorResponse } from "../lib/types";
import { changeCase, isObjectEmpty } from "../lib/utils";
import {
  EnvironmentVariablesItem,
  ProjectEnvsResponse,
  ProjectEnvsSenstiveResponse,
} from "../lib/types/project-envs.types";
import EditEnv from "./EditEnvs";
import axios from "axios";
import CreateEnv from "./CreateEnv";
import useAuth from "../hooks/useAuth";

export default function ProjectEnvs({ appFullName }: { appFullName: string }) {
  const { authHeaders } = useAuth();

  const environments = ["ALL", "DEVELOPMENT", "PREVIEW", "PRODUCTION"];

  const [environment, setEnviroment] = useState(environments[0]);

  const ProjectEnvsPayload = JSON.stringify([
    {
      operationName: "GetAppEnvironmentVariables",
      variables: {
        includeFileContent: false,
        fullName: appFullName,
      },
      query:
        "query GetAppEnvironmentVariables($fullName: String!, $environment: EnvironmentVariableEnvironment, $filterNames: [String!], $includeFileContent: Boolean = false) {\n  app {\n    byFullName(fullName: $fullName) {\n      id\n      environmentVariables(environment: $environment, filterNames: $filterNames) {\n        ...EnvironmentVariableData\n        linkedEnvironments(appFullName: $fullName)\n        valueWithFileContent: value(includeFileContent: $includeFileContent) @include(if: $includeFileContent)\n        __typename\n      }\n      __typename\n    }\n    __typename\n  }\n}\n\nfragment EnvironmentVariableData on EnvironmentVariable {\n  id\n  name\n  scope\n  value\n  environments\n  visibility\n  createdAt\n  updatedAt\n  type\n  isGlobal\n  fileName\n  apps {\n    id\n    name\n    slug\n    ownerAccount {\n      id\n      name\n      __typename\n    }\n    __typename\n  }\n  __typename\n}",
    },
  ]);

  const ProjectSenstiveEnvsPayload = JSON.stringify([
    {
      operationName: "GetAppSensitiveEnvironmentVariables",
      variables: {
        includeFileContent: false,
        fullName: appFullName,
        environment: environment,
      },
      query:
        "query GetAppSensitiveEnvironmentVariables($fullName: String!, $environment: EnvironmentVariableEnvironment, $filterNames: [String!], $includeFileContent: Boolean = false) {\n  app {\n    byFullName(fullName: $fullName) {\n      id\n      environmentVariablesIncludingSensitive(\n        environment: $environment\n        filterNames: $filterNames\n      ) {\n        ...EnvironmentVariableWithSecretData\n        valueWithFileContent: value(includeFileContent: $includeFileContent) @include(if: $includeFileContent)\n        __typename\n      }\n      __typename\n    }\n    __typename\n  }\n}\n\nfragment EnvironmentVariableWithSecretData on EnvironmentVariableWithSecret {\n  id\n  name\n  scope\n  value\n  environments\n  createdAt\n  __typename\n}",
    },
  ]);

  const { isLoading, data, revalidate } = useFetch(BASE_URL, {
    body: environment === "ALL" ? ProjectEnvsPayload : ProjectSenstiveEnvsPayload,
    method: "post",
    headers: authHeaders,
    execute: !isObjectEmpty(authHeaders),
    parseResponse: async (resp) => {
      const data = (await resp.json()) as ProjectEnvsSenstiveResponse | ProjectEnvsResponse;
      if ("errors" in data) {
        const errorMessages = (data as ErrorResponse).errors.map((error) => error.message).join(", ");
        showToast({
          title: "Error Fetching Project Enviroment Variables",
          message: errorMessages,
          style: Toast.Style.Failure,
        });
        return [];
      }

      const senstiveRes = data[0].data.app.byFullName.environmentVariablesIncludingSensitive;

      const allRes = data[0].data.app.byFullName.environmentVariables;

      const toReturn = allRes ?? senstiveRes;

      return toReturn;
    },
    onError: (error) => {
      showToast({
        title: "Error fetching environment variables",
        message: (error as Error)?.message || "",
        style: Toast.Style.Failure,
      });
    },
    initialData: [],
  });

  function getEnvString(envs: EnvironmentVariablesItem[]) {
    return envs.map((env) => `${env.name}=${env.value}`).join("\n");
  }

  async function deleteAction(env: EnvironmentVariablesItem) {
    if (
      await confirmAlert({
        title: `Delete this ${env.name} variable?`,
        message: "You will not be able to recover it",
        icon: Icon.Warning,
        primaryAction: {
          title: "Delete",
          style: Alert.ActionStyle.Destructive,
        },
      })
    ) {
      const deleteEnvPayload = JSON.stringify([
        {
          operationName: "DeleteEnvironmentVariable",
          variables: {
            id: env.id,
          },
          query:
            "mutation DeleteEnvironmentVariable($id: ID!) {\n  environmentVariable {\n    deleteEnvironmentVariable(id: $id) {\n      id\n      __typename\n    }\n    __typename\n  }\n}",
        },
      ]);

      try {
        const { data } = await axios.post(BASE_URL, deleteEnvPayload, {
          headers: authHeaders,
        });

        if ("errors" in data) {
          const errorMessages = (data as ErrorResponse).errors.map((error) => error.message).join(", ");

          showToast({
            title: "Error Fetching Project Enviroment Variables",
            message: errorMessages,
            style: Toast.Style.Failure,
          });
          return;
        }
        await showToast({ title: "Environment Variable Deleted" });
        revalidate();
      } catch (error) {
        await showToast({ title: "Error", message: (error as Error).message, style: Toast.Style.Failure });
      }
    } else {
      await showToast({ title: "Operation Canceled" });
    }
  }

  return (
    <List
      isLoading={isLoading}
      navigationTitle="Enviroment Variables"
      searchBarAccessory={
        <EnviromentDropDown
          environments={environments}
          onEnvironmentChange={(value) => {
            setEnviroment(value);
          }}
        />
      }
      actions={
        <ActionPanel>
          <Action.Push title="Create Env" icon={Icon.Plus} target={<CreateEnv refreshEnvs={revalidate} />} />
        </ActionPanel>
      }
    >
      {data && data.length > 0 ? (
        <>
          {data.map((env) => (
            <List.Item
              id={env.id}
              key={env.id}
              icon={{
                source:
                  env.visibility === "SECRET"
                    ? Icon.Lock
                    : env.visibility === "SENSITIVE"
                      ? Icon.EyeDisabled
                      : Icon.Text,
              }}
              title={env.name}
              subtitle={env.value || "*****"}
              accessories={
                environment !== "ALL"
                  ? [
                      {
                        tag: { value: env.environments.map((en) => changeCase(en, "sentence")).join(" ⋅ ") },
                      },
                    ]
                  : [
                      ...(env.isGlobal ? [{ tag: { value: "Global", color: Color.Blue } }] : []),
                      {
                        tag: {
                          value: env.visibility,
                          color:
                            env.visibility === "PUBLIC"
                              ? Color.Green
                              : env.visibility === "SECRET"
                                ? Color.Red
                                : Color.Magenta,
                        },
                      },
                      {
                        tag: { value: env.environments.map((en) => changeCase(en, "sentence")).join(" ⋅ ") },
                      },
                    ]
              }
              actions={
                <ActionPanel>
                  <Action.Push title="Create Env" icon={Icon.Plus} target={<CreateEnv refreshEnvs={revalidate} />} />

                  {environment !== "ALL" && (
                    <Action.CopyToClipboard
                      title={`Export ${environment} Envs`}
                      content={getEnvString(data)}
                      icon={Icon.CopyClipboard}
                    />
                  )}
                  {env.value !== null && (
                    <Action.CopyToClipboard
                      title="Copy"
                      content={`${env.name}=${env.value}`}
                      icon={Icon.CopyClipboard}
                    />
                  )}
                  {env.visibility !== "SECRET" && env.scope === "PROJECT" && (
                    <Action.Push
                      title="Edit"
                      icon={Icon.Pencil}
                      target={<EditEnv env={env} refreshEnvs={revalidate} />}
                    />
                  )}
                  <Action
                    title="Delete"
                    style={Action.Style.Destructive}
                    onAction={() => {
                      deleteAction(env);
                    }}
                    icon={Icon.Trash}
                  />
                </ActionPanel>
              }
            />
          ))}
        </>
      ) : (
        <List.EmptyView title="No Enviroment Variables Found" />
      )}
    </List>
  );
}

function EnviromentDropDown(props: { environments: string[]; onEnvironmentChange: (newValue: string) => void }) {
  const { environments, onEnvironmentChange } = props;

  return (
    <List.Dropdown
      tooltip="Select Environment"
      storeValue={true}
      onChange={(newValue) => {
        onEnvironmentChange(newValue);
      }}
    >
      <List.Dropdown.Section title="Environment">
        {environments.map((env) => (
          <List.Dropdown.Item key={env} title={changeCase(env, "sentence")} value={env} />
        ))}
      </List.Dropdown.Section>
    </List.Dropdown>
  );
}
