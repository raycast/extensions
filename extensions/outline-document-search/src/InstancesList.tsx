import { Instance } from "./queryInstances";
import { Action, ActionPanel, Icon, Keyboard, List, LocalStorage } from "@raycast/api";
import InstanceForm from "./InstanceForm";
import queryAuthentication from "./queryAuthentication";
import { useAsync } from "react-use";
import { useState } from "react";
import { getAvatarIcon } from "@raycast/utils";
import EmptyList from "./EmptyList";
import Shortcut = Keyboard.Shortcut;

const httpPrefix = "http";
const localStorageKey = "instances";

const useInstances = () => {
  const [instances, setInstances] = useState<Instance[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchInstances = async () => {
    setIsLoading(true);

    const instances = await LocalStorage.getItem(localStorageKey);

    if (instances) {
      if (typeof instances === "string") {
        setInstances(JSON.parse(instances));
      }
    } else {
      setInstances([]);
    }

    setIsLoading(false);
  };

  const removeInstance = async (instance: Instance) => {
    setIsLoading(true);

    await LocalStorage.setItem(
      localStorageKey,
      JSON.stringify(instances.filter((existingInstance) => existingInstance !== instance)),
    );
    await fetchInstances();
  };

  useAsync(async () => {
    await fetchInstances();
  }, []);

  return {
    instances,
    isLoading,
    fetchInstances,
    removeInstance,
    setIsLoading,
  };
};

const AddInstanceAction = ({
  fetchInstances,
  shortcut = undefined,
  title = "Add Instance",
}: {
  fetchInstances: () => Promise<void>;
  shortcut?: Shortcut;
  title: string;
}) => <Action.Push {...{ shortcut, title }} icon={Icon.Plus} target={<InstanceForm onAdd={fetchInstances} />} />;

const InstancesList = () => {
  const { instances, isLoading, fetchInstances, removeInstance, setIsLoading } = useInstances();

  const InstancesActions = ({
    shortcut = undefined,
    title = "Add Instance",
  }: {
    shortcut?: Shortcut;
    title?: string;
  }) => (
    <>
      <AddInstanceAction {...{ fetchInstances, shortcut, title }} />
      {instances.length > 0 && (
        <Action
          icon={Icon.Trash}
          onAction={async () => {
            setIsLoading(true);

            await LocalStorage.removeItem(localStorageKey);
            await fetchInstances();
          }}
          shortcut={Shortcut.Common.RemoveAll}
          style={Action.Style.Destructive}
          title="Remove All"
        />
      )}
    </>
  );

  useAsync(fetchInstances, []);

  if (instances.length === 0) {
    return (
      <List
        actions={
          <ActionPanel>
            <InstancesActions />
          </ActionPanel>
        }
        isLoading={isLoading}
        navigationTitle="Outline Instances"
      >
        <EmptyList message="Start by adding an Outline instance..." />
      </List>
    );
  } else {
    return (
      <List isLoading={isLoading} navigationTitle="Outline Instances">
        {instances.map((instance, index) => (
          <InstanceItem
            {...{ fetchInstances, instance }}
            key={index}
            remove={() => removeInstance(instance)}
            instancesActions={<InstancesActions shortcut={Shortcut.Common.New} title="Add" />}
          />
        ))}
      </List>
    );
  }
};

const InstanceItem = ({
  instance,
  remove,
  instancesActions,
  fetchInstances,
}: {
  instance: Instance;
  remove: () => void;
  instancesActions: JSX.Element;
  fetchInstances: () => Promise<void>;
}) => {
  const [avatarURL, setAvatarURL] = useState<string | undefined>(undefined);
  let url = instance.url;

  try {
    url = new URL(instance.url).hostname;
  } catch (error) {
    console.error("Invalid URL: ", instance.url, error);
  }

  useAsync(async () => {
    const authentication = await queryAuthentication(instance);

    if (authentication) {
      if (authentication.user.avatarUrl.startsWith(httpPrefix)) {
        setAvatarURL(authentication.user.avatarUrl);
      } else {
        setAvatarURL(instance.url + authentication.user.avatarUrl);
      }
    }
  }, [instance]);

  return (
    <List.Item
      actions={
        <ActionPanel>
          <Action.OpenInBrowser url={instance.url} />
          <Action.Push
            icon={Icon.Pencil}
            target={<InstanceForm {...{ instance }} onEdit={fetchInstances} />}
            title="Edit"
          />
          <Action
            icon={Icon.Trash}
            onAction={remove}
            shortcut={Shortcut.Common.Remove}
            style={Action.Style.Destructive}
            title="Remove"
          />
          <ActionPanel.Section title="Instances">{instancesActions}</ActionPanel.Section>
        </ActionPanel>
      }
      icon={{ source: avatarURL ?? getAvatarIcon(instance.name) }}
      subtitle={url}
      title={instance.name}
    />
  );
};

export default InstancesList;
