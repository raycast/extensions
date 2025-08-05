import {
  ActionPanel,
  Action,
  showToast,
  Toast,
  List,
  Alert,
  confirmAlert,
  Icon,
  Form,
  Color,
  popToRoot,
} from "@raycast/api";
import { getFavicon } from "@raycast/utils";
import { FetchChanges } from "./changes";
import { FetchProjects } from "./projects";
import { GerritAPI } from "../utils/api/gerrit";
import { GerritInstance } from "../interfaces/gerrit";
import { addGerrit, deleteGerrit, listGerrit } from "../utils/api/storage";
import { useState, useCallback, useEffect } from "react";
import { format } from "date-fns";

export function gerritMenu(menuAction: string): JSX.Element {
  const [isLoading, setIsLoading] = useState(true);
  const [gerritList, setGerritList] = useState<GerritInstance[]>([]);
  const [hasGerrit, setHasGerrit] = useState<boolean>(false);

  const fetch = useCallback(
    async function fetch(searchText: string) {
      setIsLoading(true);
      try {
        const gerritList = await listGerrit();
        setGerritList(gerritList);
        setHasGerrit(gerritList.length > 0);
        const results = gerritList.filter((g) => g.displayName.toLowerCase().includes(searchText.toLowerCase()));
        setGerritList(results);
      } catch (err) {
        showToast({
          style: Toast.Style.Failure,
          title: "Query Failed",
          message: String(err),
        });
      } finally {
        setIsLoading(false);
      }
    },
    [setIsLoading, setGerritList]
  );

  useEffect(() => {
    fetch("");
  }, []);

  return (
    <List isLoading={isLoading} onSearchTextChange={fetch} searchBarPlaceholder="Filter Instances">
      <List.EmptyView
        title={hasGerrit ? "No Instances Found" : "No Instances Added"}
        description={hasGerrit ? "" : "Add a Gerrit instance to get started"}
        icon="Gerrit.png"
        actions={
          <ActionPanel>
            <Action.Push
              icon={Icon.Plus}
              title="Add Gerrit"
              target={<AddGerrit setGerritList={setGerritList} />}
              shortcut={{ modifiers: ["cmd"], key: "n" }}
            />
          </ActionPanel>
        }
      />
      <List.Section title="Instances" subtitle={gerritList.length + ""}>
        {gerritList.map((gerrit) => (
          <GerritItem key={gerrit.displayName} gerrit={gerrit} setGerritList={setGerritList} actionItem={menuAction} />
        ))}
      </List.Section>
    </List>
  );
}

function GerritItem(props: {
  gerrit: GerritInstance;
  setGerritList: (f: (v: GerritInstance[]) => GerritInstance[]) => void;
  actionItem: string;
}) {
  let primaryAction: JSX.Element = <></>;
  if (props.actionItem == "changes") {
    primaryAction = (
      <Action.Push
        icon={Icon.BarCode}
        title="Browse Changes"
        target={<FetchChanges gerrit={props.gerrit} navigationTitle={`${props.gerrit.displayName} Changes`} />}
      />
    );
  } else if (props.actionItem == "projects") {
    primaryAction = (
      <Action.Push
        icon={Icon.BarCode}
        title="Browse Projects"
        target={<FetchProjects gerrit={props.gerrit} navigationTitle={`${props.gerrit.displayName} Projects`} />}
      />
    );
  }
  return (
    <List.Item
      title={props.gerrit.displayName}
      subtitle={props.gerrit.url}
      icon={{
        tooltip: `Version: ${props.gerrit.version}`,
        value: getFavicon(props.gerrit.url, { fallback: "Gerrit.png" }),
      }}
      accessories={[
        {
          tooltip: props.gerrit.authorized
            ? `Authenticated with API as user \`${props.gerrit.username}\``
            : "Not authenticated with API",
          tag: {
            value: props.gerrit.authorized ? "Logged In" : "Logged Out",
            color: props.gerrit.authorized ? Color.Green : Color.Red,
          },
        },
        {
          tooltip: `${
            props.gerrit.updateTime
              ? "Updated: " + format(new Date(props.gerrit.updateTime), "EEEE d MMMM yyyy 'at' HH:mm") + " UTC"
              : "Failed to update"
          }`,
        },
      ]}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            {primaryAction ? primaryAction : <></>}
            <Action.OpenInBrowser title="Open in Browser" url={props.gerrit.url} />
            <Action.Push
              icon={Icon.Plus}
              title="Add Gerrit"
              target={<AddGerrit setGerritList={props.setGerritList} />}
              shortcut={{ modifiers: ["cmd"], key: "n" }}
            />
            <Action.Push
              icon={Icon.Patch}
              title="Update Gerrit"
              target={<AddGerrit gerrit={props.gerrit} setGerritList={props.setGerritList} />}
              shortcut={{ modifiers: ["cmd"], key: "." }}
            />
            <Action.CopyToClipboard
              icon={Icon.CopyClipboard}
              title="Copy URL"
              content={props.gerrit.url}
              shortcut={{ modifiers: ["cmd", "ctrl"], key: "c" }}
            />
            <Action.SubmitForm
              icon={Icon.Warning}
              title="Delete Gerrit"
              onSubmit={async () => {
                const options: Alert.Options = {
                  title: "Delete Gerrit instance?",
                  message: "You will not be able to recover it",
                  primaryAction: {
                    title: "Delete Gerrit",
                    style: Alert.ActionStyle.Destructive,
                    onAction: async () => {
                      try {
                        await deleteGerrit(props.gerrit.id);
                        props.setGerritList((gerritList) => gerritList.filter((j) => j.id !== props.gerrit.id));
                        showToast(Toast.Style.Success, `Instance ${props.gerrit.displayName} was deleted successfully`);
                      } catch (err) {
                        showToast(
                          Toast.Style.Failure,
                          `Instance ${props.gerrit.displayName} failed to delete`,
                          String(err)
                        );
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
              content={props.gerrit.url}
              shortcut={{ modifiers: ["cmd"], key: "c" }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

function AddGerrit(props: {
  gerrit?: GerritInstance;
  setGerritList: (f: (v: GerritInstance[]) => GerritInstance[]) => void;
}) {
  const action = props.gerrit ? "updated" : "added";

  const [nameError, setNameError] = useState<string | undefined>();
  const [urlError, setUrlError] = useState<string | undefined>();
  const [isLoading, setIsLoading] = useState<boolean>(false);

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
      navigationTitle={`${props.gerrit ? "Updating " + props.gerrit.displayName : "Adding Gerrit"}`}
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            icon={Icon.PlusCircle}
            title="Confirm"
            onSubmit={async (input: GerritInstance) => {
              try {
                showToast(Toast.Style.Animated, `${props.gerrit ? "Updating" : "Adding"} ${input.displayName}`);
                const g = {
                  ...props.gerrit,
                  ...input,
                };
                setIsLoading(true);
                const gerritAPI = new GerritAPI(g);
                await gerritAPI.inspect();
                await addGerrit(gerritAPI.gerrit);

                props.setGerritList((gerritList) => {
                  if (!props.gerrit?.id) {
                    return [...gerritList, gerritAPI.gerrit];
                  }
                  return gerritList.map((gerrit) => {
                    if (gerrit.id === props.gerrit?.id) {
                      return {
                        ...gerrit,
                        ...input,
                      };
                    }
                    return gerrit;
                  });
                });
                showToast(Toast.Style.Success, `Instance ${input.displayName} was ${action} successfully`);
                // A workaround since I was not able to reload previously loaded list items when using pop()
                popToRoot();
              } catch (err) {
                showToast(Toast.Style.Failure, `Instance ${input.displayName} was not ${action}`, String(err));
              } finally {
                setIsLoading(false);
              }
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        title="Display Name"
        id="displayName"
        defaultValue={props.gerrit?.displayName}
        placeholder="Enter a Display Name"
        error={nameError}
        onChange={dropNameErrorIfNeeded}
        onBlur={(event) => {
          if (event.target.value?.length == 0) {
            setNameError("The field can't be empty");
          } else {
            dropNameErrorIfNeeded();
          }
        }}
      />
      <Form.TextField
        title="URL"
        id="url"
        defaultValue={props.gerrit?.url}
        placeholder="Enter a URL"
        error={urlError}
        onChange={dropUrlErrorIfNeeded}
        onBlur={(event) => {
          if (event.target.value?.length == 0) {
            setUrlError("The field can't be empty");
          } else {
            dropUrlErrorIfNeeded();
          }
        }}
      />
      <Form.TextField
        title="Username"
        id="username"
        defaultValue={props.gerrit?.username}
        placeholder="Enter username"
      />
      <Form.PasswordField
        title="Passowrd"
        id="password"
        defaultValue={props.gerrit?.password}
        placeholder="Enter password"
      />
      <Form.Checkbox
        title="Unsafe HTTPS"
        id="unsafeHttps"
        defaultValue={props.gerrit?.unsafeHttps}
        label="[DANGEROUS] Allow unsafe HTTPS requests"
        info="If using instances with custom certificates, consider exploring `Certificates` option in `Preferences -> Advanced -> Certificates`."
      />
    </Form>
  );
}
