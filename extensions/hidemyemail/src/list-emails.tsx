import { useState, useEffect, useRef } from "react";
import {
  ActionPanel,
  Action,
  List,
  showToast,
  Toast,
  Icon,
  Color,
  Clipboard,
  getPreferenceValues,
  Keyboard,
  confirmAlert,
  Alert,
} from "@raycast/api";
import { iCloudService } from "./api/connect";
import { HideMyEmail, MetaData } from "./api/hide-my-email";
import { formatTimestamp } from "./utils";
import { getiCloudService, Login } from "./components/Login";
import { AddressForm, AddressFormValues } from "./components/forms/AddressForm";
import { useCachedPromise } from "@raycast/utils";

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

export default function Command() {
  const [service, setService] = useState<iCloudService | null>(null);
  const [emailStatus, setEmailStatus] = useState<EmailStatus>(EmailStatus.ANY);
  const [showLoginAction, setShowLoginAction] = useState<boolean>(false);
  const { sortByCreationDate } = getPreferenceValues<Preferences.ListEmails>();
  const isOnCooldown = useRef(false);
  const effectRan = useRef(false);
  const abortable = useRef<AbortController>();

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
          if (emails.length > 0) {
            showToast({ style: Toast.Style.Failure, title: "Not logged in" });
            setShowLoginAction(true);
          }
        }
      })();
    }
  }, []);

  if (!service && !emails.length) {
    return <Login onLogin={(iService: iCloudService) => setService(iService)} />;
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
    if (isOnCooldown.current) {
      showToast({ style: Toast.Style.Failure, title: "Not too fast, please" });
      return;
    }

    isOnCooldown.current = true;
    try {
      await mutate(service?.hideMyEmail.toggleActive(email, email.isActive ? "deactivate" : "reactivate"), {
        optimisticUpdate: (emails) => {
          emails.forEach((e: HideMyEmail) => {
            if (e.anonymousId === email.anonymousId) e.isActive = !e.isActive;
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
    } finally {
      isOnCooldown.current = false;
    }
  }

  async function updateMetaData(email: HideMyEmail, newMetaData: MetaData) {
    if (!(await isServiceAvailable())) return;

    try {
      await mutate(service?.hideMyEmail.updateMetaData(email, newMetaData), {
        optimisticUpdate: (emails) => {
          emails.forEach((e: HideMyEmail) => {
            if (e.anonymousId === email.anonymousId) {
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
          try {
            await mutate(service?.hideMyEmail.deleteAddress(email), {
              optimisticUpdate: (emails) => {
                return emails.filter((e: HideMyEmail) => e.anonymousId != email.anonymousId);
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
    const toast = await showToast({ style: Toast.Style.Animated, title: "Adding address..." });
    try {
      await service?.hideMyEmail.addAddress(address, metaData);
      Clipboard.copy(address);
      revalidate();
      toast.style = Toast.Style.Success;
      toast.title = "Email added & copied";
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Adding failed";
      toast.message = (error as { message: string }).message;
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
                key={email.anonymousId}
                id={email.anonymousId}
                title={`${email.label}`}
                icon={{ source: Icon.ChevronRightSmall, tintColor: email.isActive ? Color.Green : Color.Red }}
                detail={
                  <List.Item.Detail
                    metadata={
                      <List.Item.Detail.Metadata>
                        <List.Item.Detail.Metadata.Label title="Email" text={email.hme} />
                        <List.Item.Detail.Metadata.Label title="Forward to" text={email.forwardToEmail} />
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
                      <Action.CopyToClipboard title={"Copy Email"} content={email.hme} />
                      {showLoginAction && (
                        <Action.Push
                          title={"Log In"}
                          target={<Login onLogin={(iService: iCloudService) => setService(iService)} />}
                          icon={{ source: Icon.Person, tintColor: "#4798FF" }}
                        />
                      )}
                      {service && (
                        <>
                          <Action
                            title={email.isActive ? "Deactivate" : "Activate"}
                            onAction={async () => {
                              await toggleActive(email);
                            }}
                            icon={Icon.Power}
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
                                  initialValues={{ address: email.hme, label: email.label, note: email.note }}
                                  service={service}
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
                  </ActionPanel>
                }
              />
            ),
        )
      )}
    </List>
  );
}
