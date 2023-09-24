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
import { BugzillaAPI } from "./utils/api/bugzilla";
import { BugzillaInstance } from "./interfaces/bugzilla";
import { addBugzilla, deleteBugzilla, listBugzilla } from "./utils/api/storage";
import { useState, useCallback, useEffect } from "react";
import { format } from "date-fns";

export default function Command(): JSX.Element {
  const [isLoading, setIsLoading] = useState(true);
  const [bugzillaList, setBugzillaList] = useState<BugzillaInstance[]>([]);
  const [queryText, setSearchText] = useState<string>("");

  const loadInstances = useCallback(
    async function loadInstances(text: string) {
      setIsLoading(true);
      try {
        const bugzillaList = await listBugzilla();
        setBugzillaList(bugzillaList);
        const results = bugzillaList.filter((g) => g.displayName.toLowerCase().includes(text.toLowerCase()));
        setBugzillaList(results);
        if (queryText !== text) {
          setSearchText(text);
        } else {
          setSearchText("");
        }
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
    [setIsLoading, setBugzillaList]
  );

  useEffect(() => {
    loadInstances(queryText);
  }, []);

  return (
    <List isLoading={isLoading} onSearchTextChange={loadInstances} searchBarPlaceholder="Filter Instances">
      <List.EmptyView
        title={"No Instances Found"}
        icon="Bugzilla.png"
        actions={
          <ActionPanel>
            <Action.Push
              icon={Icon.Plus}
              title="Add Bugzilla"
              target={<AddBugzilla setBugzillaList={setBugzillaList} />}
              shortcut={{ modifiers: ["cmd"], key: "n" }}
            />
          </ActionPanel>
        }
      />
      <List.Section title="Instances" subtitle={bugzillaList.length + ""}>
        {bugzillaList.map((bugzilla) => (
          <BugzillaItem key={bugzilla.displayName} bugzilla={bugzilla} setBugzillaList={setBugzillaList} />
        ))}
      </List.Section>
    </List>
  );
}

function BugzillaItem(props: {
  bugzilla: BugzillaInstance;
  setBugzillaList: (f: (v: BugzillaInstance[]) => BugzillaInstance[]) => void;
}) {
  const primaryAction: JSX.Element = <></>;
  return (
    <List.Item
      title={props.bugzilla.displayName}
      subtitle={props.bugzilla.url}
      icon={{
        tooltip: `Version: ${props.bugzilla.version}`,
        value: "Bugzilla.png",
      }}
      accessories={[
        {
          tooltip: props.bugzilla.authorized
            ? `Authenticated with API as user \`${props.bugzilla.login}\``
            : "Not authenticated with API",
          tag: {
            value: props.bugzilla.authorized ? "Logged In" : "Logged Out",
            color: props.bugzilla.authorized ? Color.Green : Color.Red,
          },
        },
        {
          tooltip: `${
            props.bugzilla.updateTime
              ? "Modified: " + format(new Date(props.bugzilla.updateTime), "EEEE d MMMM yyyy 'at' HH:mm") + " UTC"
              : "Failed to update"
          }`,
        },
      ]}
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Bugzilla">
            {primaryAction ? primaryAction : <></>}
            <Action.OpenInBrowser title="Open in Browser" url={props.bugzilla.url} />
            <Action.Push
              icon={Icon.Plus}
              title="Add Bugzilla"
              target={<AddBugzilla setBugzillaList={props.setBugzillaList} />}
              shortcut={{ modifiers: ["cmd"], key: "n" }}
            />
            <Action.Push
              icon={Icon.Patch}
              title="Update Bugzilla"
              target={<AddBugzilla bugzilla={props.bugzilla} setBugzillaList={props.setBugzillaList} />}
              shortcut={{ modifiers: ["cmd"], key: "." }}
            />
            <Action.SubmitForm
              icon={Icon.Warning}
              title="Delete Bugzilla"
              onSubmit={async () => {
                const options: Alert.Options = {
                  title: "Delete Bugzilla instance?",
                  message: "You will not be able to recover it",
                  primaryAction: {
                    title: "Delete Bugzilla",
                    style: Alert.ActionStyle.Destructive,
                    onAction: async () => {
                      try {
                        await deleteBugzilla(props.bugzilla.id);
                        props.setBugzillaList((bugzillaList) => bugzillaList.filter((j) => j.id !== props.bugzilla.id));
                        showToast(
                          Toast.Style.Success,
                          `Instance ${props.bugzilla.displayName} was deleted successfully`
                        );
                      } catch (err) {
                        showToast(
                          Toast.Style.Failure,
                          `Instance ${props.bugzilla.displayName} failed to delete`,
                          String(err)
                        );
                      }
                    },
                  },
                };
                await confirmAlert(options);
              }}
              shortcut={{ modifiers: ["ctrl"], key: "x" }}
            />
          </ActionPanel.Section>
          <ActionPanel.Section title="URL">
            <Action.CopyToClipboard
              icon={Icon.CopyClipboard}
              title="Copy URL"
              content={props.bugzilla.url}
              shortcut={{ modifiers: ["cmd", "ctrl"], key: "c" }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

function AddBugzilla(props: {
  bugzilla?: BugzillaInstance;
  setBugzillaList: (f: (v: BugzillaInstance[]) => BugzillaInstance[]) => void;
}) {
  const action = props.bugzilla ? "updated" : "added";

  const [nameError, setNameError] = useState<string | undefined>();
  const [urlError, setUrlError] = useState<string | undefined>();
  const [loginError, setLoginError] = useState<string | undefined>();
  const [keyError, setKeyError] = useState<string | undefined>();
  const [isLoading, setIsLoading] = useState<boolean>(false);

  function dropFieldErrorIfNeeded() {
    if (nameError && nameError.length > 0) {
      setNameError(undefined);
    }
    if (urlError && urlError.length > 0) {
      setUrlError(undefined);
    }
    if (loginError && loginError.length > 0) {
      setLoginError(undefined);
    }
    if (keyError && keyError.length > 0) {
      setKeyError(undefined);
    }
  }
  return (
    <Form
      navigationTitle={`${props.bugzilla ? "Updating " + props.bugzilla.displayName : "Adding Bugzilla"}`}
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            icon={Icon.PlusCircle}
            title="Confirm"
            onSubmit={async (input: BugzillaInstance) => {
              try {
                showToast(Toast.Style.Animated, `${props.bugzilla ? "Updating" : "Adding"} ${input.displayName}`);
                const g = {
                  ...props.bugzilla,
                  ...input,
                };
                setIsLoading(true);
                const bugzillaAPI = new BugzillaAPI(g);
                await bugzillaAPI.inspect();
                await addBugzilla(bugzillaAPI.bugzilla);

                props.setBugzillaList((bugzillaList) => {
                  if (!props.bugzilla?.id) {
                    return [...bugzillaList, bugzillaAPI.bugzilla];
                  }
                  return bugzillaList.map((bugzilla) => {
                    if (bugzilla.id === props.bugzilla?.id) {
                      return {
                        ...bugzilla,
                        ...input,
                      };
                    }
                    return bugzilla;
                  });
                });
                showToast(Toast.Style.Success, `Instance ${input.displayName} was ${action} successfully`);
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
        defaultValue={props.bugzilla?.displayName}
        placeholder="Enter a Display Name"
        error={nameError}
        onChange={dropFieldErrorIfNeeded}
        onBlur={(event) => {
          if (event.target.value?.length == 0) {
            setNameError("Name field can't be empty");
          } else {
            dropFieldErrorIfNeeded();
          }
        }}
      />
      <Form.TextField
        title="URL"
        id="url"
        defaultValue={props.bugzilla?.url}
        placeholder="Enter a URL"
        error={urlError}
        onChange={dropFieldErrorIfNeeded}
        onBlur={(event) => {
          if (event.target.value?.length == 0) {
            setUrlError("URL field can't be empty");
          } else {
            dropFieldErrorIfNeeded();
          }
        }}
      />
      <Form.TextField
        title="Login"
        id="login"
        defaultValue={props.bugzilla?.login}
        placeholder="Enter login"
        info="When using a password for initial validation, ensure the API key is valid for the provided login."
        error={loginError}
        onChange={dropFieldErrorIfNeeded}
        onBlur={(event) => {
          if (event.target.value?.length == 0) {
            setLoginError("Login field can't be empty");
          } else {
            dropFieldErrorIfNeeded();
          }
        }}
      />
      <Form.PasswordField
        title="API Key"
        id="apiKey"
        defaultValue={props.bugzilla?.apiKey}
        placeholder="Enter API key"
        error={keyError}
        onChange={dropFieldErrorIfNeeded}
        onBlur={(event) => {
          if (event.target.value?.length == 0) {
            setKeyError("API Key field can't be empty");
          } else {
            dropFieldErrorIfNeeded();
          }
        }}
      />
      <Form.TextField
        title="Custom Header"
        id="customHeader"
        defaultValue={props.bugzilla?.customHeader}
        placeholder="Bugzilla_api_key: ${apiKey}"
        info="Some instances allow/require sending a custom header for authentication. `${apiKey}` template will be translated to the provided API key."
      />
      <Form.Checkbox
        title="Unsafe HTTPS"
        id="unsafeHttps"
        defaultValue={props.bugzilla?.unsafeHttps}
        label="[DANGEROUS] Allow unsafe HTTPS requests"
        info="If using instances with custom certificates, consider exploring `Certificates` option in `Preferences -> Advanced -> Certificates`."
      />
    </Form>
  );
}
