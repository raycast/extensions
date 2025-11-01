import {
  Action,
  ActionPanel,
  Alert,
  Clipboard,
  Color,
  confirmAlert,
  getPreferenceValues,
  Icon,
  Image,
  Keyboard,
  List,
  showToast,
  Toast,
  useNavigation,
  LocalStorage,
} from "@raycast/api";
import { useCachedPromise, useCachedState } from "@raycast/utils";
import { useEffect, useRef, useState } from "react";
import { iCloudService } from "./api/connect";
import { iCloudSessionExpiredError } from "./api/errors";
import { getIcon, HideMyEmail, MetaData } from "./api/hide-my-email";
import { getiCloudService, Login } from "./components/Login";
import { AddressForm, AddressFormValues } from "./components/forms/AddressForm";
import { formatTimestamp } from "./utils";

enum EmailStatus {
  ANY = "ANY",
  ACTIVE = "ACTIVE",
  INACTIVE = "INACTIVE",
}

function StatusDropdown({ onStatusChange }: { onStatusChange: (newStatus: EmailStatus) => void }) {
  return (
    <List.Dropdown
      tooltip="Status"
      storeValue={true}
      onChange={(newStatus) => {
        onStatusChange(newStatus as EmailStatus);
      }}
    >
      <List.Dropdown.Section title="Email Status">
        <List.Dropdown.Item title="Any" value={EmailStatus.ANY} />
        <List.Dropdown.Item title="Active" value={EmailStatus.ACTIVE} />
        <List.Dropdown.Item title="Inactive" value={EmailStatus.INACTIVE} />
      </List.Dropdown.Section>
    </List.Dropdown>
  );
}

interface AppIcons {
  [key: string]: string;
}

export default function Command() {
  const [service, setService] = useState<iCloudService | null>(null);
  const [emailStatus, setEmailStatus] = useState<EmailStatus>(EmailStatus.ANY);
  const [showLoginAction, setShowLoginAction] = useState<boolean>(false);
  const [isLoggedOut, setIsLoggedOut] = useCachedState<boolean>("isLoggedOut", false);
  const [appIcons, setAppIcons] = useCachedState<AppIcons>(
    "app-icons",
    { default: "extension-icon.png" },
    { cacheNamespace: "app-icons" },
  );
  const { sortByCreationDate, popAfterCopy } = getPreferenceValues<Preferences.ListEmails>();
  const effectRan = useRef(false);
  const abortable = useRef<AbortController>();
  const { pop } = useNavigation();

  const {
    isLoading,
    data: emails,
    mutate,
    revalidate,
  } = useCachedPromise(
    async () => {
      const emails = await service!.hideMyEmail.getAllAdresses({ signal: abortable.current?.signal });

      if (emails) {
        if (sortByCreationDate)
          emails.sort((hme1: HideMyEmail, hme2: HideMyEmail) => hme2.createTimestamp - hme1.createTimestamp);
      }
      return emails;
    },
    [],
    {
      initialData: [],
      execute: service != null,
      abortable,
      onError: (error) => {
        if (error instanceof iCloudSessionExpiredError) {
          setShowLoginAction(true);
          setService(null);
        }
      },
      onData: async (data) => {
        if (isLoggedOut) {
          setIsLoggedOut(false);
        }
        const newIcons: AppIcons = {};
        let newData = false;
        for (const hme of data) {
          if (hme.appID && appIcons && !(hme.appID in appIcons)) {
            newIcons[hme.appID] = await getIcon(hme);
            if (newIcons[hme.appID]) newData = true;
          }
        }
        if (newData) setAppIcons((prevValue) => ({ ...prevValue, ...newIcons }));
      },
    },
  );

  useEffect(() => {
    // For React Strict Mode, which mounts twice
    if (!effectRan.current) {
      effectRan.current = true;
      (async () => {
        try {
          const iService = await getiCloudService();
          showToast({ style: Toast.Style.Success, title: "Logged in" });
          setService(iService);
        } catch (error) {
          if (emails.length > 0 && !isLoggedOut) {
            showToast({
              style: Toast.Style.Failure,
              title: "Failed to log in",
              message: (error as { message: string }).message,
            });
            setShowLoginAction(true);
          }
        }
      })();
    }
  }, []);

  if (!service && (!emails.length || isLoggedOut)) {
    return (
      <Login
        onLogin={(iService: iCloudService) => {
          setService(iService);
        }}
      />
    );
  }

  if (isLoggedOut) {
    return <List isLoading={true} />;
  }

  async function isServiceAvailable() {
    if (!service) {
      showToast({ style: Toast.Style.Animated, title: "Logging in, please wait" });
      return false;
    }
    return true;
  }

  async function toggleActive(email: HideMyEmail) {
    if (!(await isServiceAvailable())) return;
    if (abortable.current) {
      abortable.current.abort();
      abortable.current = new AbortController();
    }

    try {
      await mutate(service?.hideMyEmail.toggleActive(email, email.isActive ? "deactivate" : "reactivate"), {
        optimisticUpdate: (emails) => {
          emails.forEach((e: HideMyEmail) => {
            if (e.id === email.id) e.isActive = !e.isActive;
          });
          return emails;
        },
        shouldRevalidateAfter: true,
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Update failed",
        message: (error as { message: string }).message,
      });
    }
  }

  async function updateMetaData(email: HideMyEmail, newMetaData: MetaData) {
    if (!(await isServiceAvailable())) return;
    if (abortable.current) {
      abortable.current.abort();
      abortable.current = new AbortController();
    }

    try {
      await mutate(service?.hideMyEmail.updateMetaData(email, newMetaData), {
        optimisticUpdate: (emails) => {
          emails.forEach((e: HideMyEmail) => {
            if (e.id === email.id) {
              e.label = newMetaData.label;
              e.note = newMetaData.note;
            }
          });
          return emails;
        },
        shouldRevalidateAfter: true,
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Update failed",
        message: (error as { message: string }).message,
      });
    }
  }

  async function remove(email: HideMyEmail) {
    if (!(await isServiceAvailable())) return;

    await confirmAlert({
      title: "Are you sure?",
      message: "This will delete the email address.",
      primaryAction: {
        title: "Delete",
        style: Alert.ActionStyle.Destructive,
        onAction: async () => {
          if (abortable.current) {
            abortable.current.abort();
            abortable.current = new AbortController();
          }

          try {
            await mutate(service?.hideMyEmail.deleteAddress(email), {
              optimisticUpdate: (emails) => {
                return emails.filter((e: HideMyEmail) => e.id != email.id);
              },
              shouldRevalidateAfter: true,
            });
          } catch (error) {
            await showToast({
              style: Toast.Style.Failure,
              title: "Deleting failed",
              message: (error as { message: string }).message,
            });
          }
        },
      },
      dismissAction: {
        title: "Cancel",
      },
      rememberUserChoice: true,
    });
  }

  async function add(address: string, metaData: MetaData) {
    if (abortable.current) {
      abortable.current.abort();
      abortable.current = new AbortController();
    }
    const toast = await showToast({ style: Toast.Style.Animated, title: "Adding address..." });
    try {
      await service?.hideMyEmail.addAddress(address, metaData);
      Clipboard.copy(address);
      revalidate();
      toast.style = Toast.Style.Success;
      toast.title = "Email added & copied";
    } catch (error) {
      if (error instanceof iCloudSessionExpiredError) {
        setShowLoginAction(true);
        setService(null);
      }
      toast.style = Toast.Style.Failure;
      toast.title = "Adding failed";
      toast.message = (error as { message: string }).message;
    }
  }

  async function logOut() {
    try {
      await service?.logOut();
      LocalStorage.clear();
      setIsLoggedOut(true);
      setService(null);
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to log out",
        message: (error as { message: string }).message,
      });
    }
  }

  function onStatusChange(newStatus: EmailStatus) {
    setEmailStatus(newStatus);
  }

  return (
    <List searchBarAccessory={<StatusDropdown onStatusChange={onStatusChange} />} isShowingDetail isLoading={isLoading}>
      {emails && emails.length == 0 ? (
        <List.EmptyView
          icon={Icon.List}
          title="No Emails Created Yet"
          description="Use the action to create a new email address"
          actions={
            <ActionPanel>
              {service && (
                <Action.Push
                  title="Create New Address"
                  target={
                    <AddressForm
                      initialValues={{ label: "", note: "", address: "" }}
                      service={service}
                      setService={setService}
                      submit={async (values: AddressFormValues) => {
                        await add(values.address, { label: values.label, note: values.note });
                      }}
                    />
                  }
                  icon={Icon.PlusCircle}
                  shortcut={{ modifiers: ["cmd"], key: "n" }}
                />
              )}
            </ActionPanel>
          }
        />
      ) : (
        emails.map(
          (email: HideMyEmail) =>
            (emailStatus == EmailStatus.ANY ||
              (email.isActive && emailStatus == EmailStatus.ACTIVE) ||
              (!email.isActive && emailStatus == EmailStatus.INACTIVE)) && (
              <List.Item
                key={email.id}
                id={email.id}
                title={`${email.label}`}
                keywords={[email.address, ...email.note.split(/\s+/g)]}
                icon={{ source: Icon.ChevronRightSmall, tintColor: email.isActive ? Color.Green : Color.Red }}
                detail={
                  <List.Item.Detail
                    metadata={
                      <List.Item.Detail.Metadata>
                        <List.Item.Detail.Metadata.Label title="Email" text={email.address} />
                        <List.Item.Detail.Metadata.Label title="Forward to" text={email.forwardToEmail} />
                        <List.Item.Detail.Metadata.Separator />
                        {
                          <List.Item.Detail.Metadata.Label
                            title="Created where"
                            icon={
                              email.appID && email.appID in appIcons
                                ? { source: appIcons[email.appID], mask: Image.Mask.RoundedRectangle }
                                : null
                            }
                            text={email.origin}
                          />
                        }
                        <List.Item.Detail.Metadata.Label
                          title="Created on"
                          text={formatTimestamp(email.createTimestamp)}
                        />
                        <List.Item.Detail.Metadata.Separator />
                        <List.Item.Detail.Metadata.Label title="Status" text={email.isActive ? "Active" : "Inactive"} />
                        <List.Item.Detail.Metadata.Separator />
                        <List.Item.Detail.Metadata.Label title="Note" text={email.note || ""} />
                      </List.Item.Detail.Metadata>
                    }
                  />
                }
                actions={
                  <ActionPanel>
                    <ActionPanel.Section>
                      <Action.CopyToClipboard
                        title={"Copy Email"}
                        content={email.address}
                        onCopy={() => {
                          if (popAfterCopy) {
                            pop();
                          }
                        }}
                      />
                      {email.domain && <Action.OpenInBrowser title={"Open Website"} url={`https://${email.domain}`} />}
                      {showLoginAction && (
                        <Action.Push
                          title={"Log In"}
                          target={
                            <Login
                              onLogin={(iService: iCloudService) => {
                                setService(iService);
                                setShowLoginAction(false);
                                pop();
                              }}
                            />
                          }
                          icon={{ source: Icon.Person, tintColor: "#4798FF" }}
                          shortcut={{ modifiers: ["shift"], key: "l" }}
                        />
                      )}
                    </ActionPanel.Section>
                    <ActionPanel.Section>
                      {service && (
                        <>
                          <Action
                            title={email.isActive ? "Deactivate" : "Activate"}
                            onAction={async () => {
                              await toggleActive(email);
                            }}
                            icon={Icon.Power}
                            shortcut={{ modifiers: ["shift"], key: "return" }}
                          />
                          <Action
                            title={"Delete"}
                            onAction={async () => {
                              await remove(email);
                            }}
                            shortcut={Keyboard.Shortcut.Common.Remove}
                            style={Action.Style.Destructive}
                            icon={Icon.Trash}
                          />
                          {email.isActive && (
                            <Action.Push
                              title="Update Label or Note"
                              icon={Icon.ShortParagraph}
                              target={
                                <AddressForm
                                  initialValues={{ address: email.address, label: email.label, note: email.note }}
                                  service={service}
                                  setService={setService}
                                  submit={async (newMetaData: MetaData) => {
                                    await updateMetaData(email, newMetaData);
                                  }}
                                />
                              }
                            />
                          )}
                        </>
                      )}
                    </ActionPanel.Section>
                    {service && (
                      <ActionPanel.Section>
                        <Action.Push
                          title="Create New Address"
                          target={
                            <AddressForm
                              initialValues={{ label: "", note: "", address: "" }}
                              service={service}
                              setService={setService}
                              submit={async (values: AddressFormValues) => {
                                await add(values.address, { label: values.label, note: values.note });
                              }}
                            />
                          }
                          icon={Icon.PlusCircle}
                          shortcut={{ modifiers: ["cmd"], key: "n" }}
                        />
                      </ActionPanel.Section>
                    )}
                    {service && (
                      <ActionPanel.Section>
                        <Action
                          title="Log Out"
                          onAction={async () => {
                            await logOut();
                          }}
                          icon={Icon.Logout}
                        />
                      </ActionPanel.Section>
                    )}
                  </ActionPanel>
                }
              />
            ),
        )
      )}
    </List>
  );
}
