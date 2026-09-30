import { ActionPanel, confirmAlert, Icon, List, showToast, useNavigation, Action, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import { CreateEnvironment, Environment, Project } from "../../types";
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
  team?: string;
};

const EnvironmentVariables = ({ project, team }: Props) => {
  const [systemVars, setSystemVars] = useState<Environment[]>();
  const [plainVars, setPlainVars] = useState<Environment[]>();
  const [encryptedVars, setEncryptedVars] = useState<Environment[]>();
  const [secretVars, setSecretVars] = useState<Environment[]>();

  const { push, pop } = useNavigation();

  async function fetchAndSetVars() {
    const vars = await fetchEnvironmentVariables(project.id, team);
    const systemVars: Environment[] = [];
    const plainVars: Environment[] = [];
    const encryptedVars: Environment[] = [];
    const secretVars: Environment[] = [];

    vars.forEach((variable) => {
      if (variable.type === "system") {
        systemVars.push(variable);
      } else if (variable.type === "plain") {
        plainVars.push(variable);
      } else if (variable.type === "encrypted") {
        encryptedVars.push(variable);
      } else if (variable.type === "secret") {
        secretVars.push(variable);
      }
    });

    setSystemVars(systemVars);
    setPlainVars(plainVars);
    setEncryptedVars(encryptedVars);
    setSecretVars(secretVars);
  }

  useEffect(() => {
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

  const createEnvVar = async (envVar: CreateEnvironment) => {
    const addedVar = await createEnvironmentVariable(project.id, envVar, team);
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
      <Action.Push
        title="Edit"
        icon={Icon.Pencil}
        target={<EditEnvironmentVariable envVar={v} updateEnvVar={updateEnvVar} />}
      />
      <Action
        title="Delete"
        onAction={async () => {
          if (await confirmAlert({ title: `Are you sure you want to delete ${v.key}?` })) {
            Promise.all([deleteEnvironmentVariableById(project.id, v.id), fetchAndSetVars()]);
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
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                push(<NewEnvironmentVariable createEnvVar={createEnvVar as any} />);
              }}
            />
          </ActionPanel>
        }
      />
      {systemVarsPresent && <List.Section title="System Environment Variables" />}
      {systemVarsPresent &&
        systemVars.map((v) => <EnvironmentVariableItem type={v.type} envVar={v} key={v.id} actions={itemActions(v)} />)}
      {plainVarsPresent && <List.Section title="Plain Environment Variables" />}
      {plainVarsPresent &&
        plainVars.map((v) => <EnvironmentVariableItem type={v.type} envVar={v} key={v.id} actions={itemActions(v)} />)}
      {encryptedVarsPresent && <List.Section title="Encrypted Environment Variables" />}
      {encryptedVarsPresent &&
        encryptedVars.map((v) => (
          <EnvironmentVariableItem type={v.type} envVar={v} key={v.id} actions={itemActions(v)} />
        ))}
      {secretVarsPresent && <List.Section title="Secret Environment Variables" />}
      {secretVarsPresent &&
        secretVars.map((v) => <EnvironmentVariableItem type={v.type} envVar={v} key={v.id} actions={itemActions(v)} />)}
    </List>
  );
};
const EnvironmentVariableItem = ({
  envVar,
  actions,
}: {
  icon?: string;
  envVar: Environment;
  type: Environment["type"];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  actions: any;
}) => {
  const getIcon = (type: string) => {
    switch (type) {
      case "system":
        return Icon.Desktop;
      case "secret":
        return Icon.EyeDisabled;
      case "encrypted":
        return Icon.BlankDocument;
      case "plain":
        return Icon.BlankDocument;
      default:
        return Icon.BlankDocument;
    }
  };

  return (
    <List.Item
      title={envVar.key}
      subtitle={envVar.value}
      icon={getIcon(envVar.type)}
      actions={actions}
      key={envVar.id}
      id={envVar.id}
    />
  );
};

export default EnvironmentVariables;
