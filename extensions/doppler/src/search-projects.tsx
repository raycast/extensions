import { useCachedPromise, useForm, usePromise } from "@raycast/utils";
import { doppler } from "./lib/doppler";
import { Action, ActionPanel, Clipboard, Form, Icon, List, useNavigation } from "@raycast/api";
import { BaseHTTPError } from "@dopplerhq/node-sdk";
import { handleError } from "./lib/utils";
import { DopplerSecret, SecretVisibility } from "./lib/types";
import { useState } from "react";

export default function SearchProjects() {
  const { isLoading, data: projects = [] } = useCachedPromise(
    async () => {
      const res = await doppler.projects.list();
      return res.projects;
    },
    [],
    {
      async onError(error: Error | BaseHTTPError) {
        await handleError(error);
      },
    },
  );

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search for a project" isShowingDetail>
      {projects.map((project) => (
        <List.Item
          key={project.id}
          icon={Icon.Dot}
          title={`${project.name}`}
          accessories={[{ date: new Date(project.created_at as string) }]}
          detail={
            <List.Item.Detail
              markdown={project.description}
              metadata={
                <List.Item.Detail.Metadata>
                  <List.Item.Detail.Metadata.Label title="ID" text={project.id} />
                  <List.Item.Detail.Metadata.Label title="Slug" text={project.slug} />
                </List.Item.Detail.Metadata>
              }
            />
          }
          actions={
            <ActionPanel>
              <Action.Push icon={Icon.Eye} title="View Configs" target={<ViewConfigs project={`${project.name}`} />} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function ViewConfigs({ project }: { project: string }) {
  const { isLoading: isFetchingEnvironments, data: environments = [] } = useCachedPromise(
    async () => {
      const res = await doppler.environments.list(project);
      return res.environments;
    },
    [],
    {
      async onError(error) {
        await handleError(error);
      },
    },
  );
  const { isLoading: isFetchingConfigs, data: configs = [] } = useCachedPromise(
    async () => {
      const res = await doppler.configs.list(project);
      return res.configs;
    },
    [],
    {
      async onError(error) {
        await handleError(error);
      },
    },
  );
  const isLoading = isFetchingEnvironments || isFetchingConfigs;

  return (
    <List
      isLoading={isLoading}
      navigationTitle={`Projects / ${project} / Configs`}
      searchBarPlaceholder="Search environment and config"
    >
      {environments.map((environment) => (
        <List.Section key={environment.id} title={`${environment.name}`}>
          {configs
            .filter((config) => config.environment === environment.id)
            .toReversed()
            .map((config) => (
              <List.Item
                key={config.name}
                keywords={[`${environment.name}`]}
                icon={config.locked ? Icon.Lock : Icon.LockUnlocked}
                title={`${config.root ? "" : "↳"} ${config.name}`}
                accessories={[{ date: new Date(config.created_at as string) }]}
                actions={
                  <ActionPanel>
                    <Action.Push
                      icon={Icon.List}
                      title="View Secrets"
                      target={<ViewSecrets project={project} config={`${config.name}`} />}
                    />
                  </ActionPanel>
                }
              />
            ))}
        </List.Section>
      ))}
    </List>
  );
}

function ViewSecrets({ project, config }: { project: string; config: string }) {
  const {
    isLoading,
    data: secrets = {},
    revalidate: revalidateSecrets,
  } = useCachedPromise(
    async () => {
      const res = await doppler.secrets.list(project, config);
      return res.secrets as { [secret: string]: DopplerSecret };
    },
    [],
    {
      async onError(error) {
        await handleError(error);
      },
    },
  );

  function getVisibilityIcon(visibility: SecretVisibility) {
    switch (visibility) {
      case "masked":
        return Icon.EyeDisabled;
      case "unmasked":
        return Icon.Eye;
      case "restricted":
        return Icon.Minus;
    }
  }

  const { isLoading: isDownloading, revalidate: download } = usePromise(
    async () => {
      const res = await doppler.secrets.download(project, config);
      const downloaded = res as { [secret: string]: string };
      await Clipboard.copy(JSON.stringify(downloaded));
      return;
    },
    [],
    {
      async onError(error) {
        await handleError(error);
      },
    },
  );

  return (
    <List
      isLoading={isLoading || isDownloading}
      navigationTitle={`Projects / ${project} / Configs / ${config} / Secrets`}
      isShowingDetail
      searchBarPlaceholder="Search for a secret"
    >
      {Object.entries(secrets).map(([key, secret]) => {
        const markdown = `## RAW \n ${secret.raw} \n\n ## COMPUTED \n ${secret.computed} \n\n ### NOTE \n ${secret.note}`;
        return (
          <List.Item
            key={key}
            icon={getVisibilityIcon(secret.rawVisibility)}
            title={key}
            subtitle={secret.computedValueType.type_}
            detail={<List.Item.Detail markdown={markdown} />}
            actions={
              !isLoading && (
                <ActionPanel>
                  <Action.CopyToClipboard title="Copy Raw Secret" content={secret.raw} />
                  <Action.CopyToClipboard title="Copy Computed Secret" content={secret.computed} />
                  <Action.Push
                    icon={Icon.Pencil}
                    title="Update Note"
                    target={
                      <UpdateNote
                        note={secret.note}
                        project={project}
                        config={config}
                        secret={key}
                        onUpdate={revalidateSecrets}
                      />
                    }
                  />
                  <ActionPanel.Section>
                    <Action
                      icon={Icon.Download}
                      title="Download (Copy) Secrets"
                      onAction={download}
                      shortcut={{ modifiers: ["cmd"], key: "s" }}
                    />
                  </ActionPanel.Section>
                </ActionPanel>
              )
            }
          />
        );
      })}
    </List>
  );
}

function UpdateNote({
  note,
  project,
  config,
  secret,
  onUpdate,
}: {
  note: string;
  project: string;
  config: string;
  secret: string;
  onUpdate: (note: string) => void;
}) {
  const { pop } = useNavigation();
  const [execute, setExecute] = useState(false);
  const { itemProps, handleSubmit, values } = useForm<{ note: string }>({
    onSubmit() {
      setExecute(true);
    },
    initialValues: {
      note,
    },
  });

  const { isLoading } = usePromise(
    async () => {
      const res = await doppler.secrets.updateNote({
        project,
        config,
        secret,
        note: values.note,
      });
      onUpdate(`${res.note}`);
      pop();
      return;
    },
    [],
    {
      execute,
      async onError(error) {
        await handleError(error);
        setExecute(false);
      },
    },
  );

  return (
    <Form
      isLoading={isLoading}
      navigationTitle={`Projects / ${project} / Secrets / ${secret} / Update Note`}
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.Check} title="Update Note" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField title="Note" placeholder="Extra context" {...itemProps.note} />
    </Form>
  );
}
