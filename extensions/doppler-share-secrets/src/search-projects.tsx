import { useCachedPromise, useCachedState, useForm, usePromise } from "@raycast/utils";
import { doppler, PER_PAGE } from "./lib/doppler";
import {
  Action,
  ActionPanel,
  Clipboard,
  Form,
  Icon,
  Keyboard,
  List,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { onError } from "./lib/utils";
import { DopplerSecret, SecretVisibility } from "./type";
import { useState } from "react";

function OpenInDoppler({ route }: { route: string }) {
  const [workplace] = useCachedState("workplace");
  return (
    <Action.OpenInBrowser
      icon="doppler.png"
      title="Open in Doppler"
      url={`https://dashboard.doppler.com/workplace/${workplace}/${route}`}
      shortcut={Keyboard.Shortcut.Common.Open}
    />
  );
}

export default function SearchProjects() {
  const [, setWorkplace] = useCachedState("workplace", "");
  const { isLoading: isLoadingWorkplace } = useCachedPromise(async () => {
    const res = await doppler.workplace.get();
    const workplace = res.workplace?.id ?? "";
    setWorkplace(workplace);
  });

  const { isLoading: isLoadingProjects, data: projects = [] } = useCachedPromise(
    async () => {
      const res = await doppler.projects.list({
        perPage: 100,
      });
      return res.projects;
    },
    [],
    {
      onError,
    },
  );
  const isLoading = isLoadingWorkplace || isLoadingProjects;

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search for a project" isShowingDetail>
      {projects.map((project) => (
        <List.Item
          key={project.id}
          icon={Icon.Folder}
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
              <OpenInDoppler route={`projects/${project.name}`} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function ViewConfigs({ project }: { project: string }) {
  const { isLoading, data: { environments = [], configs = [] } = {} } = useCachedPromise(
    async () => {
      const [resEnv, resCon] = await Promise.all([doppler.environments.list(project), doppler.configs.list(project)]);
      return {
        environments: resEnv.environments,
        configs: resCon.configs,
      };
    },
    [],
    {
      onError,
    },
  );

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
                    <Action.Push
                      icon={Icon.ShortParagraph}
                      title="View Logs"
                      target={<ViewLogs project={project} config={`${config.name}`} />}
                    />
                    <OpenInDoppler route={`projects/${project}/configs/${config.name}`} />
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
      onError,
    },
  );

  function getVisibilityIcon(visibility: SecretVisibility) {
    switch (visibility) {
      case SecretVisibility.MASKED:
        return Icon.EyeDisabled;
      case SecretVisibility.UNMASKED:
        return Icon.Eye;
      case SecretVisibility.RESTRICTED:
        return Icon.Minus;
    }
  }

  const [execute, setDownload] = useState(false);
  const { isLoading: isDownloading } = usePromise(
    async () => {
      const toast = await showToast({ style: Toast.Style.Animated, title: "Downloading secrets" });
      const res = await doppler.secrets.download(project, config);
      const downloaded = res as { [secret: string]: string };
      await Clipboard.copy(JSON.stringify(downloaded));
      toast.style = Toast.Style.Success;
      toast.title = "Downloaded secrets";
      toast.message = "Copied JSON to Clipboard";
      return;
    },
    [],
    {
      execute,
      onData() {
        setDownload(false);
      },
      async onError(error) {
        await onError(error);
        setDownload(false);
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
        const markdown = `## ${key} \n---\n ## RAW \n ${secret.raw} \n\n ## COMPUTED \n ${secret.computed} \n\n ### NOTE \n ${secret.note}`;
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
                  <Action.CopyToClipboard title="Copy Secret Key" content={key} />
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
                      onAction={() => setDownload(true)}
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
        await onError(error);
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

function ViewLogs({ project, config }: { project: string; config: string }) {
  const { isLoading, data: logs = [] } = usePromise(async () => {
    const res = await doppler.configLogs.list(project, config, { perPage: PER_PAGE });
    return res.logs;
  });

  return (
    <List isLoading={isLoading} navigationTitle={`Projects / ${project} / Configs / ${config} / Logs`} isShowingDetail>
      {!isLoading && !logs.length ? (
        <List.EmptyView
          icon="ghost.svg"
          title="No Activity Recorded"
          description="There has been no activity to record over the past 3 days."
        />
      ) : (
        logs.map((log) => (
          <List.Item
            key={log.id}
            title={`${log.id}`}
            accessories={[{ date: new Date(`${log.created_at}`) }]}
            detail={
              <List.Item.Detail
                markdown={`${log.text}`}
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.Label title="Rollback" icon={log.rollback ? Icon.Check : Icon.Xmark} />
                    <List.Item.Detail.Metadata.Label
                      icon={log.user?.profile_image_url}
                      title="Username"
                      text={`${log.user?.username}`}
                    />
                  </List.Item.Detail.Metadata>
                }
              />
            }
            actions={
              <ActionPanel>
                <OpenInDoppler route={`projects/${project}/configs/${config}/logs?id=${log.id}`} />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
