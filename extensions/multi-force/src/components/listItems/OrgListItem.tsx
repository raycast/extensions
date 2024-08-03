import {
  List,
  ActionPanel,
  Action,
  Keyboard,
  Icon,
  popToRoot,
  showToast,
  Toast,
  confirmAlert,
  Alert,
} from "@raycast/api";
import { deleteOrg, openOrg } from "../../utils";
import { useMultiForceContext, useLoadingContext } from "../providers/OrgListProvider";
import { OrgListReducerType, DeveloperOrg } from "../../types";
import { AuthenticateNewOrg, DeveloperOrgDetails } from "../pages";

export function OrgListItem(props: { index: number; org: DeveloperOrg }) {
  const { index, org } = props;
  const { orgs, dispatch } = useMultiForceContext();
  const { setIsLoading } = useLoadingContext();

  const handleOrgSelection = async (orgAlias: string) => {
    setIsLoading(true);
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: `Opening ${orgAlias}`,
    });
    try {
      await openOrg(orgAlias);
      setIsLoading(false);
      toast.hide();
      popToRoot();
    } catch (error) {
      console.error(error);
    }
  };

  const confirmDeletion = async (org: DeveloperOrg) => {
    if (
      await confirmAlert({
        title: `Are you sure you want to delete\n${org.label ? org.label : org.alias}?`,
        icon: { source: Icon.Trash },
        primaryAction: {
          title: "Delete",
          style: Alert.ActionStyle.Destructive,
        },
      })
    ) {
      await deleteOrg(org.username);
      dispatch({
        type: OrgListReducerType.DELETE_ORG,
        deletedOrg: org,
      });
    }
  };

  return (
    <List.Item
      key={index}
      icon={{ source: "Salesforce.com_logo.svg.png", tintColor: org.color ?? "#0000FF" }}
      title={org.label ? `${org.label} (${org.alias})` : org.alias}
      actions={
        <ActionPanel>
          <Action title="Open" onAction={() => handleOrgSelection(org.alias)} icon={{ source: Icon.AppWindow }} />
          <Action.Push
            title="Edit"
            target={<DeveloperOrgDetails org={org} dispatch={dispatch} />}
            icon={{ source: Icon.Pencil }}
            shortcut={{ modifiers: ["cmd"], key: "return" }}
          />
          <Action.Push
            title="Authenticate"
            target={<AuthenticateNewOrg orgs={orgs} dispatch={dispatch} />}
            icon={{ source: Icon.PlusSquare }}
            shortcut={Keyboard.Shortcut.Common.New}
          />
          <Action
            title="Delete"
            style={Action.Style.Destructive}
            onAction={() => confirmDeletion(org)}
            icon={{ source: Icon.Trash }}
            shortcut={Keyboard.Shortcut.Common.Remove}
          />
        </ActionPanel>
      }
    />
  );
}
