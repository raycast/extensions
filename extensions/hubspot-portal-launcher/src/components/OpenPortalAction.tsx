import { Action, Icon, ActionPanel } from "@raycast/api";
import { Portal } from "../types";

const baseUrl = "https://app.hubspot.com/";

function OpenPortalAction(props: { portal: Portal }) {
  if (props.portal.portalType == "Dev") {
    return (
      <ActionPanel.Section>
        <Action.OpenInBrowser
          title="Open Applications"
          url={baseUrl + "developer/" + props.portal.portalId + "/applications"}
          icon={Icon.Code}
        />
        <Action.OpenInBrowser
          title="Open App-Test-Accounts"
          url={baseUrl + "developer/" + props.portal.portalId + "/test-hub-ids"}
          icon={Icon.Bug}
        />
        <Action.OpenInBrowser
          title="Open Marketplace-Listings"
          url={baseUrl + "marketplace-providers/" + props.portal.portalId + "/apps"}
          icon={Icon.Download}
        />
      </ActionPanel.Section>
    );
  } else {
    return (
      <ActionPanel.Section>
        <Action.OpenInBrowser
          title="Open Dashboard"
          url={baseUrl + "reports-dashboard/" + props.portal.portalId}
          icon={Icon.LineChart}
        />
        <Action.OpenInBrowser
          title="Open Contacts"
          url={baseUrl + "contacts/" + props.portal.portalId}
          icon={Icon.PersonLines}
        />
        <Action.OpenInBrowser
          title="Open Companies"
          url={baseUrl + "contacts/" + props.portal.portalId + "/objects/0-2"}
          icon={Icon.House}
        />
        <Action.OpenInBrowser
          title="Open Deals"
          url={baseUrl + "contacts/" + props.portal.portalId + "/objects/0-3"}
          icon={Icon.BankNote}
        />
        <Action.OpenInBrowser
          title="Open Tickets"
          url={baseUrl + "contacts/" + props.portal.portalId + "/objects/0-5"}
          icon={Icon.Buoy}
        />
      </ActionPanel.Section>
    );
  }
}

export default OpenPortalAction;
