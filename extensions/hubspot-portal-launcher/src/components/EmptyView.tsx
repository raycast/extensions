import { ActionPanel, List, Icon } from "@raycast/api";
import { PortalType, Portal, Filter } from "../types";
import CreatePortalAction from "./CreatePortalAction";

function EmptyView(props: {
  portals: Portal[];
  filter: Filter;
  searchText: string;
  onCreate: (portalName: string, portalId: string, portalType: PortalType) => void;
}) {
  if (props.portals.length > 0) {
    return (
      <List.EmptyView
        icon={Icon.MagnifyingGlass}
        title="No matching HubSpot portals found"
        description={`Can't find a HubSpot Portal matching ${props.searchText}.\nCreate it now!`}
        actions={
          <ActionPanel>
            <CreatePortalAction defaultPortalName={props.searchText} onCreate={props.onCreate} />
          </ActionPanel>
        }
      />
    );
  } else if (props.filter !== Filter.All) {
    return (
      <List.EmptyView
        icon={Icon.QuestionMarkCircle}
        title={`No ${props.filter} Portals found`}
        description={`You didn't create a ${props.filter} portal yet.\nCreate one now!`}
        actions={
          <ActionPanel>
            <CreatePortalAction defaultPortalName={props.searchText} onCreate={props.onCreate} />
          </ActionPanel>
        }
      />
    );
  } else {
    return (
      <List.EmptyView
        icon={Icon.PlusCircle}
        title="No HubSpot portals found"
        description="You didn't create any HubSpot portal yet. Add your first one and get going?"
        actions={
          <ActionPanel>
            <CreatePortalAction defaultPortalName={props.searchText} onCreate={props.onCreate} />
          </ActionPanel>
        }
      />
    );
  }
}
export default EmptyView;
