import { ActionPanel, confirmAlert, Icon, List, showToast, useNavigation, Action, Toast } from "@raycast/api";
import { ReactElement, useEffect, useState } from "react";
import { Environment, Project, Team } from "../../types";
import {
  createEnvironmentVariable,
  deleteEnvironmentVariableById,
  fetchEnvironmentVariables,
  updateEnvironmentVariable,
} from "../../vercel";
import EditEnvironmentVariable from "../forms/edit-env-var";
import NewEnvironmentVariable from "../forms/new-env-var";

type Props = {
  project: Project;
  team?: Team;
};

const EnvironmentVariables = ({ project, team }: Props) => {
  const [systemVars, setSystemVars] = useState<Environment[]>();
  const [plainVars, setPlainVars] = useState<Environment[]>();
  const [encryptedVars, setEncryptedVars] = useState<Environment[]>();
  const [secretVars, setSecretVars] = useState<Environment[]>();

  const { push, pop } = useNavigation();

  async function fetchAndSetVars() {
    const vars = await fetchEnvironmentVariables(project.id, team?.id);
    const systemVars: Environment[] = [];
    const plainVars: Environment[] = [];
    const encryptedVars: Environment[] = [];
    const secretVars: Environment[] = [];

    vars.forEach((var_) => {
      if (var_.type === "system") {
        systemVars.push(var_);
      } else if (var_.type === "plain") {
        plainVars.push(var_);
      } else if (var_.type === "encrypted") {
        encryptedVars.push(var_);
      } else if (var_.type === "secret") {
        secretVars.push(var_);
      }
    });

    setSystemVars(systemVars);
    setPlainVars(plainVars);
    setEncryptedVars(encryptedVars);
    setSecretVars(secretVars);
  }

  useEffect((): void => {
    fetchAndSetVars();
  }, []);

  const updateEnvVar = async (id: string, envVar: Partial<Environment>) => {
    const updatedEnvVariable = await updateEnvironmentVariable(project.id, id, envVar);
    if (updatedEnvVariable.key) {
      showToast({
        style: Toast.Style.Success,
        title: "Environment variable updated",
      });
      pop();
      await fetchAndSetVars();
    } else {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to update environment variable",
      });
    }
  };

  const createEnvVar = async (envVar: Partial<Environment>) => {
    const addedVar = await createEnvironmentVariable(project.id, envVar, team?.id);
    if (addedVar.error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to create environment variable",
      });
    } else if (addedVar) {
      await fetchAndSetVars();
      showToast({
        style: Toast.Style.Success,
        title: "Environment variable created",
      });
      pop();
    }
  };

  const anyVarsLoaded = !!(systemVars && plainVars && encryptedVars && secretVars);
  const systemVarsPresent = !!systemVars && systemVars.length > 0;
  const plainVarsPresent = !!plainVars && plainVars.length > 0;
  const encryptedVarsPresent = !!encryptedVars && encryptedVars.length > 0;
  const secretVarsPresent = !!secretVars && secretVars.length > 0;

  const itemActions = (v: Environment) => (
    <ActionPanel>
      <Action
        title="Edit"
        icon={Icon.Pencil}
        onAction={() => push(<EditEnvironmentVariable envVar={v} updateEnvVar={updateEnvVar} />)}
      />
      <Action
        title="Delete"
        onAction={async () => {
          if (await confirmAlert({ title: `Are you sure you want to delete ${v.key}}?` })) {
            await deleteEnvironmentVariableById(project.id, v.id);
          }
        }}
        icon={Icon.Trash}
      />
    </ActionPanel>
  );

  return (
    <List navigationTitle={`Environment variables for ${project.name}`} isLoading={!anyVarsLoaded}>
      <List.Item
        title="New Environment Variable"
        icon={Icon.Plus}
        actions={
          <ActionPanel>
            <Action
              title="Add"
              onAction={() => {
                push(<NewEnvironmentVariable createEnvVar={createEnvVar} />);
              }}
            />
          </ActionPanel>
        }
      />
      {systemVarsPresent && <List.Section title="System Environment Variables" />}
      {systemVarsPresent &&
        systemVars.map((v) => <EnvironmentVariableItem envVar={v} key={v.id} actions={itemActions(v)} />)}
      {plainVarsPresent && <List.Section title="Plain Environment Variables" />}
      {plainVarsPresent &&
        plainVars.map((v) => <EnvironmentVariableItem envVar={v} key={v.id} actions={itemActions(v)} />)}
      {encryptedVarsPresent && <List.Section title="Encrypted Environment Variables" />}
      {encryptedVarsPresent &&
        encryptedVars.map((v) => <EnvironmentVariableItem envVar={v} key={v.id} actions={itemActions(v)} />)}
      {secretVarsPresent && <List.Section title="Secret Environment Variables" />}
      {secretVarsPresent &&
        secretVars.map((v) => <EnvironmentVariableItem envVar={v} key={v.id} actions={itemActions(v)} />)}
    </List>
  );
};
const EnvironmentVariableItem = ({
  envVar,
  actions,
}: {
  icon?: string;
  envVar: Environment;
  actions: ReactElement<typeof ActionPanel>;
}) => {
  const getIcon = (type: string) => {
    switch (type) {
      case "system":
        return Icon.Desktop;
      case "secret":
        return Icon.EyeSlash;
      case "encrypted":
        return Icon.TextDocument;
      case "plain":
        return Icon.TextDocument;
      default:
        return Icon.TextDocument;
    }
  };

  return (
    <List.Item
      title={envVar.key}
      subtitle={envVar.type === "secret" ? "" : envVar.value}
      icon={getIcon(envVar.type)}
      actions={actions}
      key={envVar.id}
      id={envVar.id}
    />
  );
};

export default EnvironmentVariables;
