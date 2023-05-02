import {
  ActionPanel,
  Action,
  showToast,
  Toast,
  List,
  Alert,
  confirmAlert,
  Icon,
  useNavigation,
  Form,
} from "@raycast/api";
import { Search } from "./search";
import { Jenkins, JenkinsAPI } from "./lib/api";
import { addJenkins, deleteJenkins, listJenkins } from "./lib/storage";
import { useState, useCallback, useEffect } from "react";

export default function Command() {
  const [isLoading, setIsLoading] = useState(true);
  const [jenkinsList, setJenkinsList] = useState<Jenkins[]>([]);
  const [hasJenkins, setHasJenkins] = useState<boolean>(false);

  const search = useCallback(
    async function search(searchText: string) {
      setIsLoading(true);
      try {
        const jenkinsList = await listJenkins();
        setJenkinsList(jenkinsList);
        setHasJenkins(jenkinsList.length > 0);
        const results = jenkinsList.filter((j) => j.name.toLowerCase().includes(searchText.toLowerCase()));
        setJenkinsList(results);
      } catch (err) {
        showToast({ style: Toast.Style.Failure, title: "Search Failed", message: String(err) });
      } finally {
        setIsLoading(false);
      }
    },
    [setIsLoading, setJenkinsList]
  );

  useEffect(() => {
    search("");
  }, []);

  return (
    <List isLoading={isLoading} onSearchTextChange={search} searchBarPlaceholder="Search Jenkins..." throttle>
      <List.EmptyView
        title={hasJenkins ? "No Results" : "No Jenkins Added"}
        description={hasJenkins ? "Try a different search." : "Add a Jenkins to get started."}
        icon="iconnv.png"
        actions={
          <ActionPanel>
            <Action.Push
              icon={Icon.Plus}
              title="Add Jenkins"
              target={<AddJenkins setJenkinsList={setJenkinsList} />}
              shortcut={{ modifiers: ["cmd"], key: "n" }}
            />
          </ActionPanel>
        }
      />
      <List.Section title="Results" subtitle={jenkinsList.length + ""}>
        {jenkinsList.map((jenkins) => (
          <JenkinsItem key={jenkins.name} jenkins={jenkins} setJenkinsList={setJenkinsList} />
        ))}
      </List.Section>
    </List>
  );
}

function JenkinsItem(props: { jenkins: Jenkins; setJenkinsList: (f: (v: Jenkins[]) => Jenkins[]) => void }) {
  return (
    <List.Item
      title={props.jenkins.name}
      subtitle={props.jenkins.version}
      accessories={[{ text: props.jenkins.url }]}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.OpenInBrowser title="Open in Browser" url={props.jenkins.url} />
            <Action.Push
              icon={Icon.BarCode}
              title="Manage Jobs"
              target={<Search jenkins={props.jenkins} navigationTitle="Manage Jobs" />}
            />
            <Action.Push
              icon={Icon.Filter}
              title="Global Search"
              target={<Search jenkins={props.jenkins} navigationTitle="Global Search" isGlobalSearch={true} />}
              shortcut={{ modifiers: ["cmd"], key: "g" }}
            />
            <Action.Push
              icon={Icon.Plus}
              title="Add Jenkins"
              target={<AddJenkins setJenkinsList={props.setJenkinsList} />}
              shortcut={{ modifiers: ["cmd"], key: "n" }}
            />
            <Action.Push
              icon={Icon.Patch}
              title="Update Jenkins"
              target={<AddJenkins jenkins={props.jenkins} setJenkinsList={props.setJenkinsList} />}
              shortcut={{ modifiers: ["cmd"], key: "." }}
            />
            <Action.SubmitForm
              icon={Icon.Warning}
              title="Delete Jenkins"
              onSubmit={async () => {
                const options: Alert.Options = {
                  title: "Delete the Jenkins?",
                  message: "You will not be able to recover it",
                  primaryAction: {
                    title: "Delete Jenkins",
                    style: Alert.ActionStyle.Destructive,
                    onAction: async () => {
                      try {
                        await deleteJenkins(props.jenkins.id);
                        props.setJenkinsList((jenkinsList) => jenkinsList.filter((j) => j.id !== props.jenkins.id));
                      } catch (err) {
                        showToast(Toast.Style.Failure, "Delete failed", String(err));
                      }
                    },
                  },
                };
                await confirmAlert(options);
              }}
              shortcut={{ modifiers: ["cmd"], key: "delete" }}
            />
            <Action.CopyToClipboard
              title="Copy URL"
              content={props.jenkins.url}
              shortcut={{ modifiers: ["cmd"], key: "c" }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

function AddJenkins(props: { jenkins?: Jenkins; setJenkinsList: (f: (v: Jenkins[]) => Jenkins[]) => void }) {
  const { pop } = useNavigation();
  const action = props.jenkins ? "Update" : "Add";

  const [nameError, setNameError] = useState<string | undefined>();
  const [urlError, setUrlError] = useState<string | undefined>();

  function dropNameErrorIfNeeded() {
    if (nameError && nameError.length > 0) {
      setNameError(undefined);
    }
  }
  function dropUrlErrorIfNeeded() {
    if (urlError && urlError.length > 0) {
      setUrlError(undefined);
    }
  }

  return (
    <Form
      navigationTitle={action + " Jenkins"}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            icon={Icon.PlusCircle}
            title="Confirm"
            onSubmit={async (input: Jenkins) => {
              try {
                const j = {
                  ...props.jenkins,
                  ...input,
                };
                const jenkinsAPI = new JenkinsAPI(j);
                await jenkinsAPI.inspect();
                await addJenkins(jenkinsAPI.jenkins);

                props.setJenkinsList((jenkinsList) => {
                  if (!props.jenkins?.id) {
                    return [...jenkinsList, jenkinsAPI.jenkins];
                  }
                  return jenkinsList.map((jenkins) => {
                    if (jenkins.id === props.jenkins?.id) {
                      return {
                        ...jenkins,
                        ...input,
                      };
                    }
                    return jenkins;
                  });
                });
                pop();
              } catch (err) {
                showToast(Toast.Style.Failure, `${action} Jenkins Failed`, String(err));
              }
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        title="Name"
        id="name"
        defaultValue={props.jenkins?.name}
        placeholder="Enter name"
        error={nameError}
        onChange={dropNameErrorIfNeeded}
        onBlur={(event) => {
          if (event.target.value?.length == 0) {
            setNameError("The field should't be empty!");
          } else {
            dropNameErrorIfNeeded();
          }
        }}
      />
      <Form.TextField
        title="URL"
        id="url"
        defaultValue={props.jenkins?.url}
        placeholder="Enter url"
        error={urlError}
        onChange={dropUrlErrorIfNeeded}
        onBlur={(event) => {
          if (event.target.value?.length == 0) {
            setUrlError("The field should't be empty!");
          } else {
            dropUrlErrorIfNeeded();
          }
        }}
      />
      <Form.TextField
        title="Username"
        id="username"
        defaultValue={props.jenkins?.username}
        placeholder="Enter username"
      />
      <Form.PasswordField title="Token" id="token" defaultValue={props.jenkins?.token} placeholder="Enter token" />
      <Form.Checkbox
        title="Unsafe HTTPS"
        id="unsafeHttps"
        defaultValue={props.jenkins?.unsafeHttps}
        label="[DANGEROUS] Allow unsafe HTTPS requests"
      />
    </Form>
  );
}
