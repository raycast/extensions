import {
  ActionPanel,
  Action,
  List,
  Icon,
  launchCommand,
  LaunchType,
  Color,
  Alert,
  confirmAlert,
  showToast,
  Toast,
  popToRoot,
  Detail,
  openExtensionPreferences,
} from "@raycast/api";
import { getFavicon } from "@raycast/utils";
import { useEffect, useState } from "react";

import { deleteDomain, getDomains } from "./utils/api";
import { Domain, Response } from "./utils/types";

interface State {
  domains?: Domain[];
  showDetails: boolean;
  error?: string;
  isLoading?: boolean;
  listSharedDomains?: boolean;
}

export default function ListDomains() {
  const [state, setState] = useState<State>({
    domains: undefined,
    showDetails: false,
    error: "",
    isLoading: false,
    listSharedDomains: false,
  });

  useEffect(() => {
    async function getFromApi() {
      const response: Response = await getDomains(true);

      switch (response.type) {
        case "error":
          setState((prevState) => {
            return { ...prevState, error: response.message, isLoading: false };
          });
          break;

        case "success":
          setState((prevState) => {
            return { ...prevState, error: "", domains: response.result.domains };
          });
          break;

        default:
          setState((prevState) => {
            return { ...prevState, isLoading: false };
          });
          break;
      }
    }
    getFromApi();
  }, []);

  const toggleShowDetails = () => {
    setState((prevState) => {
      return { ...prevState, showDetails: !state.showDetails };
    });
  };

  const handleDelete = async (domain: string) => {
    if (
      await confirmAlert({
        title: `Delete ${domain}?`,
        message: "You will not be able to recover it",
        primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
      })
    ) {
      setState((prevState: State) => {
        return { ...prevState, isLoading: true };
      });

      const response = await deleteDomain(domain);
      switch (response.type) {
        case "error":
          await showToast(Toast.Style.Failure, "Purelymail Error", response.message);
          setState((prevState) => {
            return { ...prevState, isLoading: false };
          });
          break;

        case "success":
          setState((prevState) => {
            return { ...prevState, isLoading: false };
          });
          await showToast(Toast.Style.Success, "Domain Deleted", "DOMAIN: " + domain);
          await popToRoot({
            clearSearchBar: true,
          });
          break;

        default:
          setState((prevState: State) => {
            return { ...prevState, isLoading: false };
          });
          break;
      }
    }
  };

  const updateDomainSettings = async (domain: Domain) => {
    setState((prevState: State) => {
      return { ...prevState, isLoading: true };
    });
    if (domain.isShared) {
      await showToast(Toast.Style.Failure, "Purelymail Error", "Can't Edit Shared Domains.");
    } else {
      await launchCommand({
        name: "update-domain-settings",
        type: LaunchType.UserInitiated,
        arguments: {
          domain: domain.name,
        },
      });
    }
    setState((prevState) => {
      return { ...prevState, isLoading: false };
    });
  };

  const toggleSharedDomains = () => {
    setState((prevState) => {
      return { ...prevState, listSharedDomains: !state.listSharedDomains };
    });
  };

  return state.error ? (
    <Detail
      markdown={"⚠️" + state.error}
      actions={
        <ActionPanel>
          <Action title="Open Extension Preferences" onAction={openExtensionPreferences} />
        </ActionPanel>
      }
    />
  ) : (
    <List
      isLoading={state.domains === undefined || state.isLoading}
      searchBarPlaceholder="Search for domain..."
      isShowingDetail={state.showDetails}
      navigationTitle={`${state.domains?.length || 0} domains`}
    >
      <List.Section title="Domains">
        {(state.domains || [])
          .filter((domain) => (state.listSharedDomains ? domain : !domain.isShared))
          .map((domain) => (
            <List.Item
              key={domain.name}
              icon={getFavicon(`https://${domain.name}`, { fallback: Icon.List })}
              title={domain.name}
              accessories={
                state.showDetails
                  ? undefined
                  : [
                      { tag: { value: "isShared", color: domain.isShared ? Color.Green : Color.Red } },
                      { text: { value: "" }, icon: Icon.Minus },
                      { tag: { value: "MX", color: domain.dnsSummary.passesMx ? Color.Green : Color.Red } },
                      { tag: { value: "SPF", color: domain.dnsSummary.passesSpf ? Color.Green : Color.Red } },
                      { tag: { value: "DKIM", color: domain.dnsSummary.passesDkim ? Color.Green : Color.Red } },
                      { tag: { value: "DMARC", color: domain.dnsSummary.passesDmarc ? Color.Green : Color.Red } },
                    ]
              }
              actions={
                <ActionPanel>
                  <Action title="Toggle Details" icon={Icon.AppWindowSidebarRight} onAction={toggleShowDetails} />
                  <Action
                    title="Update Domain Settings"
                    icon={Icon.Gear}
                    onAction={() => updateDomainSettings(domain)}
                  />
                  <Action
                    title="Create User"
                    icon={Icon.AddPerson}
                    onAction={async () => {
                      await launchCommand({
                        name: "create-user",
                        type: LaunchType.UserInitiated,
                        arguments: {
                          domain: domain.name,
                        },
                      });
                    }}
                  />
                  <Action
                    title="Delete Domain"
                    onAction={() => handleDelete(domain.name)}
                    icon={Icon.DeleteDocument}
                    shortcut={{ modifiers: ["cmd"], key: "d" }}
                  />
                </ActionPanel>
              }
              detail={
                <List.Item.Detail
                  metadata={
                    <List.Item.Detail.Metadata>
                      <List.Item.Detail.Metadata.Label
                        title="Name"
                        icon={getFavicon(`https://${domain.name}`)}
                        text={domain.name}
                      />
                      <List.Item.Detail.Metadata.Label
                        title="Allow Account Reset"
                        icon={domain.allowAccountReset ? Icon.Check : Icon.Multiply}
                      />
                      <List.Item.Detail.Metadata.Label
                        title="Symbolic Subaddressing"
                        icon={domain.symbolicSubaddressing ? Icon.Check : Icon.Multiply}
                      />
                      <List.Item.Detail.Metadata.Label
                        title="Is Shared"
                        icon={domain.isShared ? Icon.Check : Icon.Multiply}
                      />
                      <List.Item.Detail.Metadata.Separator />
                      <List.Item.Detail.Metadata.TagList title="DNS Summary">
                        {Object.entries(domain.dnsSummary).map(([key, val]) => (
                          <List.Item.Detail.Metadata.TagList.Item
                            key={key}
                            text={key.replace("passes", "").toUpperCase()}
                            color={val ? Color.Green : Color.Red}
                          />
                        ))}
                      </List.Item.Detail.Metadata.TagList>
                    </List.Item.Detail.Metadata>
                  }
                />
              }
            />
          ))}
        <List.Item
          title="Add New Domain"
          icon={{ source: Icon.Plus }}
          actions={
            <ActionPanel>
              <Action
                title="Add New Domain"
                icon={Icon.Plus}
                onAction={async () => {
                  await launchCommand({ name: "add-domain", type: LaunchType.UserInitiated });
                }}
              />
            </ActionPanel>
          }
        />
        <List.Item
          title="Toggle Shared Domains"
          icon={Icon.Repeat}
          actions={
            <ActionPanel>
              <Action title="Toggle Shared Domains" onAction={toggleSharedDomains} />
            </ActionPanel>
          }
        />
      </List.Section>
    </List>
  );
}
