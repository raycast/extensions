import { useEffect, useState } from "react";
import {
  Action,
  ActionPanel,
  Alert,
  confirmAlert,
  Icon,
  LaunchType,
  List,
  LocalStorage,
  launchCommand,
  showToast,
  Toast,
} from "@raycast/api";
import { showFailureToast } from "@raycast/utils";

export default function Command() {
  const [addresses, setAddresses] = useState<string[]>([]);
  const [activeAddress, setActiveAddress] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadAddresses = async () => {
    setIsLoading(true);
    try {
      // Get current active address
      const currentActive = await LocalStorage.getItem<string>("mail_address");
      setActiveAddress(currentActive ?? null);

      // Get saved addresses list
      const savedAddresses = await LocalStorage.getItem<string>("mail_addresses");

      if (savedAddresses) {
        setAddresses(JSON.parse(savedAddresses));
      } else if (currentActive) {
        // Migration: if no list exists but there's an active address, create the list
        const newList = [currentActive];
        await LocalStorage.setItem("mail_addresses", JSON.stringify(newList));
        setAddresses(newList);
      } else {
        setAddresses([]);
      }
    } catch (error) {
      await showFailureToast(error, { title: "Failed to load addresses" });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAddresses();
  }, []);

  const setAsActive = async (address: string) => {
    try {
      await LocalStorage.setItem("mail_address", address);
      setActiveAddress(address);
      await showToast({
        style: Toast.Style.Success,
        title: "Active address updated",
        message: address,
      });
    } catch (error) {
      await showFailureToast(error, { title: "Failed to set active address" });
    }
  };

  const deleteAddress = async (address: string) => {
    const confirmed = await confirmAlert({
      title: "Delete Address",
      message: `Are you sure you want to delete "${address}"?`,
      primaryAction: {
        title: "Delete",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (!confirmed) return;

    try {
      const updatedList = addresses.filter((a) => a !== address);
      await LocalStorage.setItem("mail_addresses", JSON.stringify(updatedList));
      setAddresses(updatedList);

      // If deleted address was active, clear it or set first available
      if (activeAddress === address) {
        if (updatedList.length > 0) {
          await LocalStorage.setItem("mail_address", updatedList[0]);
          setActiveAddress(updatedList[0]);
        } else {
          await LocalStorage.removeItem("mail_address");
          setActiveAddress(null);
        }
      }

      await showToast({
        style: Toast.Style.Success,
        title: "Address deleted",
      });
    } catch (error) {
      await showFailureToast(error, { title: "Failed to delete address" });
    }
  };

  const viewInboxForAddress = async (address: string) => {
    try {
      await LocalStorage.setItem("mail_address", address);
      setActiveAddress(address);
      await launchCommand({ name: "view-inbox", type: LaunchType.UserInitiated });
    } catch (error) {
      await showFailureToast(error, { title: "Unable to open inbox" });
    }
  };

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search addresses...">
      {addresses.length === 0 && !isLoading ? (
        <List.EmptyView
          icon={Icon.Envelope}
          title="No saved addresses"
          description="Create a temporary email address to get started."
          actions={
            <ActionPanel>
              <Action
                title="Create New Address"
                icon={Icon.Plus}
                onAction={async () => {
                  try {
                    await launchCommand({ name: "set-new-temp-mail-address", type: LaunchType.UserInitiated });
                  } catch (error) {
                    await showFailureToast(error, { title: "Unable to open command" });
                  }
                }}
              />
            </ActionPanel>
          }
        />
      ) : (
        addresses.map((address) => (
          <List.Item
            key={address}
            icon={activeAddress === address ? Icon.CheckCircle : Icon.Circle}
            title={address}
            accessories={activeAddress === address ? [{ tag: { value: "Active", color: "#4CAF50" } }] : []}
            actions={
              <ActionPanel>
                <ActionPanel.Section>
                  {activeAddress !== address && (
                    <Action
                      title="Set as Active"
                      icon={Icon.CheckCircle}
                      onAction={() => setAsActive(address)}
                    />
                  )}
                  <Action
                    title="View Inbox"
                    icon={Icon.Envelope}
                    onAction={() => viewInboxForAddress(address)}
                  />
                  <Action.CopyToClipboard title="Copy Address" content={address} />
                </ActionPanel.Section>
                <ActionPanel.Section>
                  <Action
                    title="Create New Address"
                    icon={Icon.Plus}
                    shortcut={{ modifiers: ["cmd"], key: "n" }}
                    onAction={async () => {
                      try {
                        await launchCommand({ name: "set-new-temp-mail-address", type: LaunchType.UserInitiated });
                      } catch (error) {
                        await showFailureToast(error, { title: "Unable to open command" });
                      }
                    }}
                  />
                  <Action
                    title="Delete Address"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    shortcut={{ modifiers: ["ctrl"], key: "x" }}
                    onAction={() => deleteAddress(address)}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
