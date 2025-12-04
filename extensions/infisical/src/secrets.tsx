import {
  List,
  Icon,
  ActionPanel,
  Action,
  useNavigation,
  showToast,
  Toast,
  Form,
  confirmAlert,
  Color,
  Alert,
  Keyboard,
} from "@raycast/api";
import { usePromise, useForm, FormValidation, useCachedState, MutatePromise } from "@raycast/utils";
import { useState } from "react";
import { infisical } from "./infisical";
import { Workspace } from "./types";
import { Secret } from "@infisical/sdk";
import { OpenInInfisical } from "./components";

async function confirmAndDelete(
  secret: Secret,
  projectId: string,
  environment: string,
  mutateSecrets: MutatePromise<Secret[], undefined>,
) {
  const options: Alert.Options = {
    icon: { source: Icon.Trash, tintColor: Color.Red },
    title: "Do you want to delete this secret?",
    message: "This action is irreversible.",
    primaryAction: {
      style: Alert.ActionStyle.Destructive,
      title: "Delete Secret",
    },
  };
  if (!(await confirmAlert(options))) return;

  const toast = await showToast(Toast.Style.Animated, "Deleting Secret", secret.secretKey);
  try {
    await mutateSecrets(
      infisical.secrets().deleteSecret(secret.secretKey, {
        environment,
        projectId,
      }),
      {
        optimisticUpdate(data = []) {
          return data.filter((s) => s.id !== secret.id);
        },
        shouldRevalidateAfter: false,
      },
    );
    toast.style = Toast.Style.Success;
    toast.title = "Deleted";
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "Failed";
    toast.message = `${error}`;
  }
}

export default function Secrets({ project }: { project: Workspace }) {
  const [revealValues, setRevealValues] = useCachedState("reveal-secret-values", false);
  const [environment, setEnvironment] = useState(project.environments[0].slug);
  const {
    isLoading,
    data: secrets = [],
    error,
    mutate,
  } = usePromise(
    async (environment) => {
      const res = await infisical.secrets().listSecrets({
        projectId: project.id,
        environment,
      });
      return res.secrets;
    },
    [environment],
  );

  return (
    <List
      navigationTitle={`Manage Projects / ${project?.name} / Secrets`}
      isLoading={isLoading}
      isShowingDetail
      searchBarAccessory={
        <List.Dropdown tooltip="Environment" onChange={setEnvironment}>
          {project.environments.map((environment) => (
            <List.Dropdown.Item key={environment.slug} title={environment.name} value={environment.slug} />
          ))}
        </List.Dropdown>
      }
    >
      {!isLoading && !secrets.length && !error ? (
        <List.EmptyView
          icon={Icon.Folder}
          description="Let's add some secrets"
          actions={
            <ActionPanel>
              <Action.Push
                icon={Icon.Plus}
                title="Add Secret"
                target={<AddorEditSecret projectId={project.id} projectName={project.name} environment={environment} />}
                onPop={mutate}
              />
            </ActionPanel>
          }
        />
      ) : (
        secrets.map((secret) => (
          <List.Item
            key={secret.id}
            icon={Icon.Key}
            title={secret.secretKey}
            detail={
              <List.Item.Detail
                markdown={
                  !secret.secretValue
                    ? "EMPTY"
                    : revealValues
                      ? secret.secretValue
                      : secret.secretValue.replace(/./g, "*")
                }
                metadata={
                  <List.Item.Detail.Metadata>
                    {secret.tags.length ? (
                      <List.Item.Detail.Metadata.TagList title="Tags">
                        {secret.tags.map((tag) => (
                          <List.Item.Detail.Metadata.TagList.Item key={tag} text={tag} />
                        ))}
                      </List.Item.Detail.Metadata.TagList>
                    ) : (
                      <List.Item.Detail.Metadata.Label title="Tags" icon={Icon.Minus} />
                    )}
                  </List.Item.Detail.Metadata>
                }
              />
            }
            actions={
              <ActionPanel>
                <Action
                  icon={revealValues ? Icon.EyeDisabled : Icon.Eye}
                  title={revealValues ? "Hide Values" : "Reveal Values"}
                  onAction={() => setRevealValues((reveal) => !reveal)}
                />
                <Action.CopyToClipboard title="Copy Secret" content={secret.secretValue} />
                <Action.Push
                  icon={Icon.Pencil}
                  title="Edit Secret"
                  target={
                    <AddorEditSecret
                      projectId={project.id}
                      projectName={project.name}
                      environment={environment}
                      initialSecret={secret}
                    />
                  }
                  onPop={mutate}
                  shortcut={Keyboard.Shortcut.Common.Edit}
                />
                <Action
                  icon={Icon.Trash}
                  title="Delete Secret"
                  onAction={() => confirmAndDelete(secret, project.id, environment, mutate)}
                  shortcut={Keyboard.Shortcut.Common.Remove}
                  style={Action.Style.Destructive}
                />
                <Action.Push
                  icon={Icon.Plus}
                  title="Add Secret"
                  target={
                    <AddorEditSecret projectId={project.id} projectName={project.name} environment={environment} />
                  }
                  onPop={mutate}
                  shortcut={Keyboard.Shortcut.Common.New}
                />
                <OpenInInfisical route={`projects/secret-management/${project.id}/overview`} />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}

function AddorEditSecret({
  projectId,
  projectName,
  environment,
  initialSecret,
}: {
  projectId: string;
  projectName: string;
  environment: string;
  initialSecret?: Secret;
}) {
  interface FormValues {
    secretName: string;
    secretValue: string;
  }
  const { pop } = useNavigation();
  const { handleSubmit, itemProps } = useForm<FormValues>({
    async onSubmit(values) {
      const { secretName, secretValue } = values;
      const toast = await showToast(
        Toast.Style.Animated,
        initialSecret ? "Editing" : "Creating",
        initialSecret?.secretKey || secretName,
      );
      try {
        if (initialSecret) {
          await infisical.secrets().updateSecret(initialSecret.secretKey, {
            newSecretName: secretName,
            secretValue,
            projectId,
            environment,
          });
        } else {
          await infisical.secrets().createSecret(secretName, {
            secretValue,
            projectId,
            environment,
          });
        }
        toast.style = Toast.Style.Success;
        toast.title = initialSecret ? "Edited" : "Created";
        pop();
      } catch (error) {
        const err = error as Error;
        let message = err.message;
        if (err.name.includes("InfisicalSDK")) {
          const jsonStart = err.message.indexOf("{");
          const jsonString = err.message.substring(jsonStart);
          const parsedMessage = JSON.parse(jsonString) as {
            message: Array<{ code: string; expected: string; received: string; path: string[]; message: string }>;
          };
          const messageArray = parsedMessage.message;
          const firstMessage = messageArray[0];
          message = `${firstMessage.message}: ${firstMessage.path.join()}`;
        }
        toast.style = Toast.Style.Failure;
        toast.title = "Failed";
        toast.message = message;
      }
    },
    initialValues: {
      secretName: initialSecret?.secretKey,
      secretValue: initialSecret?.secretValue,
    },
    validation: {
      secretName: FormValidation.Required,
    },
  });
  return (
    <Form
      navigationTitle={`Manage Projects / ${projectName} / Secrets / ${initialSecret ? "Edit" : "Add"}`}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            icon={initialSecret ? Icon.Pencil : Icon.Plus}
            title={initialSecret ? "Edit Secret" : "Create Secret"}
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
    >
      <Form.TextField title="Key" placeholder="Type your secret name" {...itemProps.secretName} />
      <Form.PasswordField title="Value" placeholder="EMPTY" {...itemProps.secretValue} />
    </Form>
  );
}
