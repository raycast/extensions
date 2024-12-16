import { useState, useEffect } from "react";
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
import { Login } from "./components/Login";
import { MetaDataForm } from "./components/forms/MetaDataForm";
import { AddressForm } from "./components/forms/AddressForm";

enum Status {
  ANY = "ANY",
  ACTIVE = "ACTIVE",
  INACTIVE = "INACTIVE",
}

function StatusDropdown({ onStatusChange }: { onStatusChange: (newStatus: Status) => void }) {
  return (
    <List.Dropdown
      tooltip="Status"
      storeValue={true}
      onChange={(newStatus) => {
        onStatusChange(newStatus as Status);
      }}
    >
      <List.Dropdown.Section title="Email Status">
        <List.Dropdown.Item title="Any" value={Status.ANY} />
        <List.Dropdown.Item title="Active" value={Status.ACTIVE} />
        <List.Dropdown.Item title="Inactive" value={Status.INACTIVE} />
      </List.Dropdown.Section>
    </List.Dropdown>
  );
}

export default function Command() {
  const [service, setService] = useState<iCloudService | null>(null);
  const [emails, setEmails] = useState<Array<HideMyEmail> | null>(null);
  const [status, setStatus] = useState<Status>(Status.ANY);
  const { sortByCreationDate } = getPreferenceValues<Preferences.ListEmails>();

  useEffect(() => {
    (async () => {
      await updateAddressList();
    })();
  }, [service]);

  if (!service) {
    return <Login onLogin={(iService: iCloudService) => setService(iService)} />;
  }

  if (emails === null) {
    return <List isLoading={true} />;
  }

  async function updateAddressList() {
    if (service) {
      const data = await service.hideMyEmail.getAllAdresses();
      const hmeEmails = data?.["hmeEmails"];
      if (hmeEmails) {
        if (sortByCreationDate)
          hmeEmails.sort((hme1: HideMyEmail, hme2: HideMyEmail) => hme2.createTimestamp - hme1.createTimestamp);

        setEmails(hmeEmails);
      }
    }
  }

  async function toggleActive(email: HideMyEmail) {
    const toast = await showToast({ style: Toast.Style.Animated, title: "Updating..." });

    try {
      await service?.hideMyEmail.toggleActive(email.anonymousId, email.isActive ? "deactivate" : "reactivate");
      await updateAddressList();
      toast.style = Toast.Style.Success;
      toast.title = "Updated";
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Update failed";
      toast.message = (error as { message: string }).message;
    }
  }

  async function updateMetaData(email: HideMyEmail, newMetaData: MetaData) {
    const toast = await showToast({ style: Toast.Style.Animated, title: "Updating..." });
    try {
      await service?.hideMyEmail.updateMetaData(email.anonymousId, newMetaData);
      await updateAddressList();
      toast.style = Toast.Style.Success;
      toast.title = "Label updated";
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Update failed";
      toast.message = (error as { message: string }).message;
    }
  }

  async function remove(email: HideMyEmail) {
    await confirmAlert({
      title: "Are you sure?",
      message: "This will delete the email address.",
      primaryAction: {
        title: "Delete",
        style: Alert.ActionStyle.Destructive,
        onAction: async () => {
          const toast = await showToast({ style: Toast.Style.Animated, title: "Updating..." });
          try {
            if (email.isActive) {
              await service?.hideMyEmail.toggleActive(email.anonymousId, "deactivate");
            }
            await service?.hideMyEmail.deleteAddress(email.anonymousId);
            await updateAddressList();
            toast.style = Toast.Style.Success;
            toast.title = "Address deleted";
          } catch (error) {
            toast.style = Toast.Style.Failure;
            toast.title = "Update failed";
            toast.message = (error as { message: string }).message;
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
      await updateAddressList();
      toast.style = Toast.Style.Success;
      toast.title = "Email added & copied";
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Adding failed";
      toast.message = (error as { message: string }).message;
    }
  }

  function onStatusChange(newStatus: Status) {
    setStatus(newStatus);
  }

  return (
    <List searchBarAccessory={<StatusDropdown onStatusChange={onStatusChange} />} isShowingDetail>
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
                      service={service}
                      submit={async (address, metaData) => {
                        await add(address, metaData);
                      }}
                    />
                  }
                  shortcut={{ modifiers: ["cmd"], key: "n" }}
                />
              )}
            </ActionPanel>
          }
        />
      ) : (
        emails.map(
          (email) =>
            (status == Status.ANY ||
              (email.isActive && status == Status.ACTIVE) ||
              (!email.isActive && status == Status.INACTIVE)) && (
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
                        <List.Item.Detail.Metadata.TagList title="Status">
                          <List.Item.Detail.Metadata.TagList.Item
                            text={email.isActive ? "Active" : "Inactive"}
                            color={email.isActive ? "#07ba65" : "#f5090a"}
                          />
                        </List.Item.Detail.Metadata.TagList>
                        <List.Item.Detail.Metadata.Separator />
                        <List.Item.Detail.Metadata.Label title="Note" text={email.note || "-"} />
                      </List.Item.Detail.Metadata>
                    }
                  />
                }
                actions={
                  <ActionPanel>
                    <ActionPanel.Section>
                      <Action.CopyToClipboard title={"Copy Email"} content={email.hme} />
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
                        <>
                          <Action.Push
                            title="Update Label"
                            icon={Icon.ShortParagraph}
                            target={
                              <MetaDataForm
                                type={"Label"}
                                currentValue={email.label}
                                onSubmit={async (newLabel) => {
                                  await updateMetaData(email, { label: newLabel, note: email.note });
                                }}
                              />
                            }
                          />

                          <Action.Push
                            title="Update Note"
                            icon={Icon.Paragraph}
                            target={
                              <MetaDataForm
                                type={"Note"}
                                currentValue={email.note}
                                onSubmit={async (newNote) => {
                                  await updateMetaData(email, { label: email.label, note: newNote });
                                }}
                              />
                            }
                          />
                        </>
                      )}
                    </ActionPanel.Section>
                    <ActionPanel.Section>
                      {service && (
                        <Action.Push
                          title="Create New Address"
                          target={
                            <AddressForm
                              service={service}
                              submit={async (address, metaData) => {
                                await add(address, metaData);
                              }}
                            />
                          }
                          shortcut={{ modifiers: ["cmd"], key: "n" }}
                          icon={Icon.PlusCircle}
                        />
                      )}
                    </ActionPanel.Section>
                  </ActionPanel>
                }
              />
            ),
        )
      )}
    </List>
  );
}
