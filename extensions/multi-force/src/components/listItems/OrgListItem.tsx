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
  Color,
} from "@raycast/api";
import { deleteOrg, openOrg } from "../../utils";
import { useMultiForceContext, useLoadingContext } from "../providers/OrgListProvider";
import { OrgListReducerType, DeveloperOrg } from "../../types";
import { AuthenticateNewOrg, DeveloperOrgDetails } from "../pages";
import { HOME_PATH, SETUP_PATH } from "../../constants";

// Helper function to get expiration status
const getExpirationStatus = (org: DeveloperOrg): { icon?: Icon; tooltip?: string; tintColor?: Color } => {
  if (!org.expirationDate) return {};

  // Parse the date and set it to midnight in local timezone
  const [year, month, day] = org.expirationDate.split("-").map(Number);
  const expirationDate = new Date(year, month - 1, day); // month is 0-based in JS
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()); // midnight today

  const daysUntilExpiration = Math.ceil((expirationDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (daysUntilExpiration <= 0) {
    return {
      icon: Icon.ExclamationMark,
      tooltip: "Scratch org has expired",
      tintColor: Color.Red,
    };
  }
  if (daysUntilExpiration <= 7) {
    return {
      icon: Icon.Warning,
      tooltip: `Scratch org expires in ${daysUntilExpiration} day${daysUntilExpiration === 1 ? "" : "s"}`,
      tintColor: Color.Yellow,
    };
  }
  return {};
};

export function OrgListItem(props: { index: number; org: DeveloperOrg }) {
  const { index, org } = props;
  const { orgs, dispatch } = useMultiForceContext();
  const { setIsLoading } = useLoadingContext();

  const handleOrgSelection = async (orgAlias: string, url?: string) => {
    setIsLoading(true);
    const targetOpen = url === SETUP_PATH ? " Setup" : url === HOME_PATH ? " Home" : "";
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: `Opening ${org.label ? org.label : org.alias}${targetOpen}`,
    });
    try {
      await openOrg(orgAlias, url);
      dispatch({
        type: OrgListReducerType.UPDATE_ORG,
        updatedOrg: { ...org, lastViewedAt: Date.now() },
      });
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
        message: `Deleting will log you out in MultiForce, VSCode, and the SF CLI tool. You can always re-add this org later.`,
        icon: { source: Icon.Trash },
        primaryAction: {
          title: "Delete",
          style: Alert.ActionStyle.Destructive,
        },
      })
    ) {
      try {
        await deleteOrg(org.username);
        dispatch({
          type: OrgListReducerType.DELETE_ORG,
          deletedOrg: org,
        });
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to Delete",
          message:
            "There was a problem deleting this org. Please exit MultiForce, reopen, and look for the notification that your orgs are out of sync.",
        });
      }
    }
  };

  const expirationStatus = getExpirationStatus(org);

  return (
    <List.Item
      key={index}
      icon={{ source: "Salesforce.com_logo.svg.png", tintColor: org.color ?? "#0000FF" }}
      title={org.label ? `${org.label} (${org.alias})` : org.alias}
      accessories={
        expirationStatus.icon
          ? [
              {
                icon: expirationStatus.icon,
                tooltip: expirationStatus.tooltip,
                tag: {
                  value: expirationStatus.tooltip || "",
                  color: expirationStatus.tintColor,
                },
              },
            ]
          : undefined
      }
      actions={
        <ActionPanel>
          <Action
            title={org.openToPath === SETUP_PATH ? "Open Setup" : org.openToPath === HOME_PATH ? "Open Home" : "Open"}
            onAction={() => handleOrgSelection(org.alias, org.openToPath)}
            icon={{ source: Icon.AppWindow }}
            shortcut={
              org.openToPath === SETUP_PATH
                ? { modifiers: ["cmd"], key: "s" }
                : org.openToPath === HOME_PATH
                  ? { modifiers: ["cmd"], key: "h" }
                  : undefined
            }
          />
          <Action.Push
            title="Edit"
            target={<DeveloperOrgDetails org={org} dispatch={dispatch} />}
            icon={{ source: Icon.Pencil }}
            shortcut={{ modifiers: ["cmd"], key: "return" }}
          />
          {org.openToPath !== HOME_PATH ? (
            <Action
              title="Open Home"
              onAction={() => handleOrgSelection(org.alias, HOME_PATH)}
              icon={{ source: Icon.House }}
              shortcut={{ modifiers: ["cmd"], key: "h" }}
            />
          ) : undefined}
          {org.openToPath !== SETUP_PATH ? (
            <Action
              title="Open Setup"
              onAction={() => handleOrgSelection(org.alias, SETUP_PATH)}
              icon={{ source: Icon.WrenchScrewdriver }}
              shortcut={{ modifiers: ["cmd"], key: "s" }}
            />
          ) : undefined}
          <Action.Push
            title="Add"
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
