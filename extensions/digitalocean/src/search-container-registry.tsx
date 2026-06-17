import {
  Repository,
  useContainerRegistry,
  useContainerRegistryRepositories,
  useContainerRegistryRepositoryTags,
} from "./client";
import { Action, ActionPanel, Color, Detail, Icon, List } from "@raycast/api";
import { useEffect, useState } from "react";

export default function Command() {
  const { data, error, isLoading } = useContainerRegistry();
  const [isLoadingRepositories, setLoadingRepositories] = useState(true);

  if (error) {
    return <Detail markdown={`Failed to get Container Registry information: ${error.message}`} />;
  }

  return (
    <List isLoading={isLoading || isLoadingRepositories} isShowingDetail={true}>
      <List.Section title="Registry Information">
        {data?.registry && (
          <List.Item
            title={data.registry.name}
            subtitle={data.registry.region}
            detail={
              <List.Item.Detail
                metadata={
                  <Detail.Metadata>
                    <Detail.Metadata.Label title="Region" text={data.registry.region} />
                    <Detail.Metadata.Label
                      title="Created at"
                      text={new Date(data.registry.created_at).toLocaleDateString()}
                    />
                    <Detail.Metadata.Label
                      title="Used storage"
                      text={Math.round(data.registry.storage_usage_bytes / 1024 / 1024) + "mb"}
                    />
                    {data.registry.subscription && (
                      <>
                        <Detail.Metadata.Label title="Subscription Tier" text={data.registry.subscription.tier.name} />
                        <Detail.Metadata.Label
                          title="Included Storage Bytes"
                          text={Math.round(data.registry.subscription.tier.included_storage_bytes / 1024 / 1024) + "mb"}
                        />
                        <Detail.Metadata.Label
                          title="Included Bandwidth Bytes"
                          text={
                            Math.round(data.registry.subscription.tier.included_bandwidth_bytes / 1024 / 1024) + "mb"
                          }
                        />
                      </>
                    )}
                  </Detail.Metadata>
                }
              />
            }
          />
        )}
      </List.Section>
      <List.Section title="Repositories">
        {data?.registry && (
          <ContainerRegistryRepositoryItems
            registry={data?.registry.name}
            setLoadingRepositories={setLoadingRepositories}
          />
        )}
      </List.Section>
    </List>
  );
}

function ContainerRegistryRepositoryItems({
  registry,
  setLoadingRepositories,
}: {
  registry: string;
  setLoadingRepositories: (value: boolean) => void;
}) {
  const { data, error, isLoading } = useContainerRegistryRepositories(registry);

  useEffect(() => {
    setLoadingRepositories(isLoading);
  }, [isLoading]);

  if (error) {
    return <List.Item title="Error loading repositories" icon={{ source: Icon.Warning, tintColor: Color.Red }} />;
  }

  return (
    <>
      {data?.repositories?.map((repository) => (
        <List.Item
          key={repository.name}
          title={repository.name}
          subtitle={`${repository.tag_count} tags`}
          actions={
            <ActionPanel>
              <Action.Push title="View Tags" target={<ContainerRegistryRepository repository={repository} />} />
            </ActionPanel>
          }
          detail={
            <List.Item.Detail
              metadata={
                <Detail.Metadata>
                  <Detail.Metadata.Label title="Tags" text={String(repository.tag_count)} />
                  <Detail.Metadata.Label title="Manifests" text={String(repository.manifest_count)} />
                </Detail.Metadata>
              }
            />
          }
        />
      ))}
    </>
  );
}

function ContainerRegistryRepository({ repository }: { repository: Repository }) {
  const [isLoading, setLoading] = useState(true);

  return (
    <List isLoading={isLoading} isShowingDetail={true}>
      <ContainerRegistryRepositoryTagItems repository={repository} setLoadingTags={setLoading} />
    </List>
  );
}

function ContainerRegistryRepositoryTagItems({
  repository,
  setLoadingTags,
}: {
  repository: Repository;
  setLoadingTags: (value: boolean) => void;
}) {
  const { data, error, isLoading } = useContainerRegistryRepositoryTags(repository.registry_name, repository.name);

  useEffect(() => {
    setLoadingTags(isLoading);
  }, [isLoading]);

  if (error) {
    return <List.Item title="Error loading tags" icon={{ source: Icon.Warning, tintColor: Color.Red }} />;
  }

  return (
    <>
      {data?.tags.map((tag) => (
        <List.Item
          key={tag.tag}
          title={tag.tag}
          subtitle={new Date(tag.updated_at).toLocaleString()}
          actions={
            <ActionPanel>
              <Action.CopyToClipboard content={tag.tag} title="Copy Tag" />
            </ActionPanel>
          }
          detail={
            <List.Item.Detail
              metadata={
                <Detail.Metadata>
                  <Detail.Metadata.Label title="Tag" text={tag.tag} />
                  <Detail.Metadata.Label title="Manifest Digest" text={tag.manifest_digest} />
                  <Detail.Metadata.Label
                    title="Compressed Size"
                    text={Math.round(tag.compressed_size_bytes / 1024 / 1024) + "mb"}
                  />
                  <Detail.Metadata.Label title="Size" text={Math.round(tag.size_bytes / 1024 / 1024) + "mb"} />
                  <Detail.Metadata.Label title="Updated At" text={new Date(tag.updated_at).toLocaleString()} />
                </Detail.Metadata>
              }
            />
          }
        />
      ))}
    </>
  );
}
