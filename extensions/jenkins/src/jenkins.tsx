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
import { SearchJob } from "./search";
import { Jenkins, JenkinsAPI } from "./lib/api";
import { addJenkins, deleteJenkins, listJenkins } from "./lib/storage";
import { useState, useCallback, useEffect } from "react";

export default function Command() {
  const [isLoading, setIsLoading] = useState(true);
  const [jenkinsList, setJenkinsList] = useState<Jenkins[]>([]);

  const search = useCallback(
    async function search(searchText: string) {
      setIsLoading(true);
      try {
        const jenkinsList = await listJenkins();
        const results = jenkinsList.filter((j) => j.name.toLowerCase().includes(searchText.toLowerCase()));
        setJenkinsList(results);
      } catch (error) {
        showToast({ style: Toast.Style.Failure, title: "Search failed", message: String(error) });
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
    <List
      isLoading={isLoading}
      onSearchTextChange={search}
      searchBarPlaceholder="Search jenkins..."
      throttle
      actions={
        <ActionPanel>
          <Action.Push
            icon={Icon.NewDocument}
            title="Add jenkins"
            target={<AddJenkins setJenkinsList={setJenkinsList} />}
          />
        </ActionPanel>
      }
    >
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
              title="Manage jobs"
              target={<SearchJob jenkins={props.jenkins} mode="normal" />}
            />
            <Action.Push
              icon={Icon.Filter}
              title="Global search"
              target={<SearchJob jenkins={props.jenkins} mode="global" />}
              shortcut={{ modifiers: ["cmd"], key: "g" }}
            />
            <Action.Push
              icon={Icon.Plus}
              title="Add jenkins"
              target={<AddJenkins setJenkinsList={props.setJenkinsList} />}
              shortcut={{ modifiers: ["cmd"], key: "n" }}
            />
            <Action.Push
              icon={Icon.Patch}
              title="Update jenkins"
              target={<AddJenkins jenkins={props.jenkins} setJenkinsList={props.setJenkinsList} />}
              shortcut={{ modifiers: ["cmd"], key: "." }}
            />
            <Action.SubmitForm
              icon={Icon.Warning}
              title="Delete jenkins"
              onSubmit={async () => {
                const options: Alert.Options = {
                  title: "Delete jenkins?",
                  primaryAction: {
                    title: "Delete jenkins",
                    onAction: async () => {
                      await deleteJenkins(props.jenkins.id);
                    },
                  },
                };
                if (await confirmAlert(options)) {
                  await showToast(Toast.Style.Success, "Delete jenkins successfully");
                }
              }}
              shortcut={{ modifiers: ["cmd"], key: "delete" }}
            />
            <Action.CopyToClipboard
              title="Copy jenkins url"
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
      navigationTitle={action + " jenkins"}
      actions={
        <ActionPanel>
          <Action.SubmitForm
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
                showToast(Toast.Style.Failure, action + " jenkins failed", String(err));
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
    </Form>
  );
}
