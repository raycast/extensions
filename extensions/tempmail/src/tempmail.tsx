import {
  getMailboxData,
  newAuth,
  downloadMessage,
  deleteEmail,
  createHTMLFile,
  setNewExpiry,
  getDomains,
  createCustomAuth,
} from "../lib/main";
import {
  Action,
  ActionPanel,
  open,
  List,
  Icon,
  Alert,
  confirmAlert,
  showToast,
  Toast,
  Color,
  showInFinder,
  Form,
  LocalStorage,
  useNavigation,
} from "@raycast/api";
import MessageComponent from "./message";
import { useCachedPromise, getAvatarIcon } from "@raycast/utils";
import { useEffect, useRef, useState } from "react";
import moment from "moment";

enum EmailViewMedium {
  MailApp,
  Browser,
  Finder,
}

interface FormValues {
  username: string;
  domain: string;
  expiresNever: boolean;
}

function NewCustomEmail({ update }) {
  const abortable = useRef<AbortController>();
  const { isLoading, data, revalidate } = useCachedPromise(getDomains, [], {
    abortable,
    onError: (e) => {
      if (e.message == "Email Expired") revalidate();
      else if (e.message == "Token Expired") revalidate();
      else
        showToast({
          style: Toast.Style.Failure,
          title: "Something went wrong",
          message: e.message,
        });
    },
  });

  const [usernameError, setUsernameError] = useState<string | undefined>();
  const { pop } = useNavigation();

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Generate Custom Email"
            icon={{ source: Icon.PlusCircle }}
            onSubmit={async (values: FormValues) => {
              if (values.username.length == 0) {
                setUsernameError("Username should't be empty");
                return;
              }
              if (values.username.includes(" ")) {
                setUsernameError("Username cannot include spaces");
                return;
              }

              try {
                const res = await createCustomAuth(`${values.username}@${values.domain}`);
                if (res == false) {
                  setUsernameError("That username is already taken");
                  return;
                }

                if (values.expiresNever) {
                  await LocalStorage.setItem("expiry_time", null);
                }
                showToast({
                  style: Toast.Style.Success,
                  title: "Created New Email",
                  message: `${values.username}@${values.domain} has been created`,
                });

                await update();
                pop();
              } catch (e) {
                showToast({
                  style: Toast.Style.Failure,
                  title: "Something went wrong",
                  message: e.message,
                });
              }
            }}
          ></Action.SubmitForm>
        </ActionPanel>
      }
    >
      <Form.TextField
        id="username"
        title="Username"
        info="Create a unique username for your email address"
        error={usernameError}
        onChange={() => setUsernameError(undefined)}
        onBlur={(event) => {
          if (event.target.value?.length == 0) {
            setUsernameError("Username should't be empty");
          } else if (event.target.value?.includes(" ")) {
            setUsernameError("Username cannot include spaces");
          } else {
            setUsernameError(undefined);
          }
        }}
      ></Form.TextField>
      <Form.Dropdown id="domain" title="Domain" info="Select an available domain from the list" isLoading={isLoading}>
        {data &&
          data["hydra:member"].map((domain) => (
            <Form.Dropdown.Item key={domain.domain} title={domain.domain} value={domain.domain}></Form.Dropdown.Item>
          ))}
      </Form.Dropdown>
      <Form.Description title="" text=""></Form.Description>
      <Form.Checkbox id="expiry" title="Expiry" label="Expires never" defaultValue={true}></Form.Checkbox>
    </Form>
  );
}

// Returns the main React component for a view command
export default function Command() {
  const abortable = useRef<AbortController>();
  const { isLoading, data, error, revalidate } = useCachedPromise(getMailboxData, [], {
    abortable,
    keepPreviousData: true,
    onError: (e) => {
      if (e.message == "Email Expired") revalidate();
      else if (e.message == "Token Expired") revalidate();
      else
        showToast({
          style: Toast.Style.Failure,
          title: "Something went wrong",
          message: e.message,
        });
    },
  });

  useEffect(() => {
    const updateTime = setInterval(() => {
      revalidate();
    }, 5000);
    return () => clearInterval(updateTime);
  }, []);

  const downloadEmail = async (url: string, openIn: EmailViewMedium) => {
    try {
      const emailPath = await downloadMessage(url);

      if (openIn == EmailViewMedium.MailApp) open(emailPath as string);
      if (openIn == EmailViewMedium.Finder) showInFinder(emailPath as string);

      if (openIn == EmailViewMedium.Browser) {
        const htmlPath = await createHTMLFile(emailPath);
        open(htmlPath);
      }
    } catch (e) {
      if (e.message == "Token Expired") revalidate();
      else
        showToast({
          style: Toast.Style.Failure,
          title: "Something went wrong",
          message: e.message,
        });
    }
  };

  const generateNewAddress = async () => {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Generating new email",
    });

    await newAuth();
    await revalidate();

    toast.style = Toast.Style.Success;
    toast.title = "Generated new email";
  };

  const options: Alert.Options = {
    title: "Generate a New Email Address",
    message: "All your current messages will be lost",
    primaryAction: {
      title: "Generate",
      style: Alert.ActionStyle.Default,
      onAction: generateNewAddress,
    },
    dismissAction: {
      title: "Cancel",
      style: Alert.ActionStyle.Cancel,
    },
  };

  return (
    <List filtering={false} isLoading={isLoading}>
      {error && error.message != "Email Expired" && (
        <List.EmptyView
          title="An Error Occurred. Trying Again"
          description={error.message}
          icon={{ source: Icon.XMarkCircle, tintColor: Color.Red }}
        ></List.EmptyView>
      )}
      {error && error.message == "Email Expired" && (
        <List.EmptyView
          title="Previous Email Expired"
          description="Generating a new one for you, hold tight!"
          icon={{ source: Icon.Stars, tintColor: Color.Blue }}
        ></List.EmptyView>
      )}
      {!error && (
        <>
          <List.Section title="Current Address">
            {isLoading && !data && <List.Item icon={{ source: Icon.CircleProgress }} title="Fetching address" />}
            {data && (
              <>
                <List.Item
                  title={data.currentAddress}
                  icon={{ source: Icon.Envelope }}
                  accessories={[{ tag: data?.expiryMessage ?? "" }]}
                  actions={
                    <ActionPanel>
                      <Action.CopyToClipboard title="Copy Email Address to Clipboard" content={data.currentAddress} />
                      <ActionPanel.Submenu title="Set Expiry..." icon={{ source: Icon.Hourglass }}>
                        {[null, 5, 10, 30, 60, 720, 1440, 10080].map((minutes) => (
                          <Action
                            key={minutes}
                            title={minutes ? `${moment.duration(minutes, "minutes").humanize()}` : "Never"}
                            onAction={async () => {
                              await setNewExpiry(minutes);
                              await revalidate();
                            }}
                          ></Action>
                        ))}
                      </ActionPanel.Submenu>
                    </ActionPanel>
                  }
                />
                <List.Item
                  title="Generate a New Email"
                  icon={{ source: Icon.PlusCircle }}
                  actions={
                    <ActionPanel>
                      <Action
                        title="Generate a Random New Email"
                        icon={{ source: Icon.Center }}
                        onAction={() => confirmAlert(options)}
                      ></Action>
                      <Action.Push
                        title="Generate a Custom New Email"
                        icon={{ source: Icon.PlusCircle }}
                        target={<NewCustomEmail update={revalidate}></NewCustomEmail>}
                      ></Action.Push>
                    </ActionPanel>
                  }
                />
              </>
            )}
          </List.Section>
          <List.Section title="Messages Received">
            {isLoading && !data && (
              <List.Item
                icon={{ source: Icon.CircleProgress }}
                title="Loading Messages"
                subtitle="Retrieving messages from server"
              />
            )}
            {(data?.messages || []).map((message) => (
              <List.Item
                key={message.id}
                id={message.id}
                icon={getAvatarIcon(message.from.name)}
                title={message.from.name}
                accessories={[
                  {
                    tag: { value: message.subject, color: Color.Blue },
                    icon: { source: Icon.BullsEye },
                    tooltip: "Subject",
                  },
                  { text: message.intro },
                  message.seen
                    ? {
                        text: moment
                          .duration(new Date(message.createdAt).getTime() - new Date().getTime())
                          .humanize(true),
                        tooltip: "Received",
                      }
                    : { tag: { value: "Unread", color: Color.Yellow }, tooltip: "New Email" },
                ]}
                actions={
                  <ActionPanel>
                    <ActionPanel.Section title="View">
                      <Action.Push
                        title="View Email"
                        icon={{ source: Icon.Eye }}
                        target={MessageComponent({ id: message.id })}
                      />
                      <ActionPanel.Submenu title="View Email Externally" icon={{ source: Icon.Upload }}>
                        <Action
                          title="Mail App"
                          icon={{ source: Icon.AppWindow }}
                          onAction={() => downloadEmail(message.downloadUrl, EmailViewMedium.MailApp)}
                        />
                        <Action
                          title="Browser"
                          icon={{ source: Icon.Globe }}
                          onAction={() => downloadEmail(message.downloadUrl, EmailViewMedium.Browser)}
                        />
                        <Action
                          title="Download Email"
                          icon={{ source: Icon.Download }}
                          onAction={() => downloadEmail(message.downloadUrl, EmailViewMedium.Finder)}
                        />
                      </ActionPanel.Submenu>
                    </ActionPanel.Section>
                    <ActionPanel.Section title="Modify">
                      <Action
                        title="Delete Email"
                        icon={{ source: Icon.Trash }}
                        onAction={async () => {
                          try {
                            await deleteEmail(message.id);
                          } catch (e) {
                            showToast({
                              style: Toast.Style.Failure,
                              title: "Something went wrong",
                              message: e.message,
                            });
                          } finally {
                            await revalidate();
                          }
                        }}
                        style={Action.Style.Destructive}
                      ></Action>
                    </ActionPanel.Section>
                  </ActionPanel>
                }
              />
            ))}
            {data?.messages?.length == 0 && (
              <List.Item
                icon={{ source: Icon.Ellipsis, tintColor: Color.SecondaryText }}
                title={"Inbox Empty"}
                subtitle="Messages will automatically appear here"
              />
            )}
          </List.Section>
          <List.Section title="">
            {data && (
              <List.Item
                title=""
                actions={
                  <ActionPanel>
                    <Action.OpenInBrowser title="Mail.tm" url="https://mail.tm"></Action.OpenInBrowser>
                  </ActionPanel>
                }
                accessories={[
                  { text: "powered by " },
                  { tag: { value: "Mail.tm", color: Color.Blue }, icon: Icon.AtSymbol },
                ]}
              ></List.Item>
            )}
          </List.Section>
        </>
      )}
    </List>
  );
}
