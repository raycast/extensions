import { ActionPanel, Action, List } from "@raycast/api";
import { Organization } from "../types/Organization";
import BrowseOrganizationDomains from "./browse-organization-domains";
import BrowseOrganizationHostings from "./browse-organization-hostings";
import BrowseOrganizationEmailHostings from "./browse-organization-email-hostings";

type MetadataProps = {
  organization: Organization;
};

export default function BrowseOrganizationProducts(props: MetadataProps) {
  return (
    <List>
      <List.Item
        key="open-manager"
        icon={"manager.png"}
        title="Open Manager"
        actions={
          <ActionPanel>
            <Action.OpenInBrowser
              url={"https://manager.infomaniak.com/v3/" + props.organization.id.toString() + "/ng/home"}
            />
          </ActionPanel>
        }
      />
      <List.Item
        key="open-domains"
        icon={"domain.png"}
        title="List Domains"
        actions={
          <ActionPanel>
            <Action.Push title="Browse" target={<BrowseOrganizationDomains organization={props.organization} />} />
          </ActionPanel>
        }
      />
      <List.Item
        key="open-hostings"
        icon={"hosting.png"}
        title="List Hostings"
        actions={
          <ActionPanel>
            <Action.Push title="Browse" target={<BrowseOrganizationHostings organization={props.organization} />} />
          </ActionPanel>
        }
      />
      <List.Item
        key="open-email-hostings"
        icon={"email-hosting.png"}
        title="List Email Hostings"
        actions={
          <ActionPanel>
            <Action.Push
              title="Browse"
              target={<BrowseOrganizationEmailHostings organization={props.organization} />}
            />
          </ActionPanel>
        }
      />
    </List>
  );
}
