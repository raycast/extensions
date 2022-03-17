import {
  ActionPanel,
  SubmitFormAction,
  Icon,
  Form,
  FormValues,
  preferences,
  showToast,
  ToastStyle,
  useNavigation,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { EnvironmentVariable, updateEnvironmentVariable, fetchEnvironmentVariables } from "./vercel";

export function UpdateEnvironmentVariable(props: { projectId: string; projectName: string }): JSX.Element {
  // Get props values
  const projectId = props.projectId;
  const projectName = props.projectName;

  // Get preference values
  const token = String(preferences.token.value);
  if (token.length !== 24) {
    showToast(ToastStyle.Failure, "Invalid token detected");
    throw new Error("Invalid token length detected");
  }

  // Setup useState objects
  const [environmentVariables, setEnvironmentVariables] = useState<EnvironmentVariable[]>();

  // Submit form validation
  function validateForm(values: FormValues): boolean {
    if (!values.env_value) {
      showToast(ToastStyle.Failure, "Please set new value");
      return false;
    }
    return true;
  }

  // On form submit function
  const { pop } = useNavigation();
  async function handleSubmit(values: FormValues) {
    if (!validateForm(values)) {
      return;
    }
    const envConf = JSON.parse(values.env_conf);
    const updatedEnvVariable = await updateEnvironmentVariable(
      projectId,
      envConf.envId,
      envConf.envKey,
      values.env_value
    );

    if (!updatedEnvVariable || !updatedEnvVariable.key) {
      showToast(ToastStyle.Failure, "Couldn't update variable");
    } else {
      showToast(ToastStyle.Success, updatedEnvVariable.key + " was updated!");
      pop();
    }
  }

  useEffect(() => {
    const fetchData = async () => {
      const fetchedEnvironmentVariables = await fetchEnvironmentVariables(projectId);
      setEnvironmentVariables(fetchedEnvironmentVariables);
    };
    fetchData();
  }, [projectId]);
  return (
    <Form
      navigationTitle={projectName + " ->  Environment Variables"}
      isLoading={!environmentVariables}
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Environment Variable">
            <SubmitFormAction title="Update Variable" icon={Icon.Pencil} onSubmit={handleSubmit} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    >
      <Form.Dropdown id="env_conf" title="Environment Variable">
        {environmentVariables?.map((ev) => {
          return <Form.Dropdown.Item value={JSON.stringify({ envId: ev.id, envKey: ev.key })} title={ev.key} />;
        })}
      </Form.Dropdown>
      <Form.TextArea id="env_value" title="New Value" />
    </Form>
  );
}
