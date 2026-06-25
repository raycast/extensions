import { List } from "@raycast/api";
import { buildAppUrl } from "../helpers/appUrl";
import { ProjectResourceList } from "../helpers/ProjectResourceList";
import { ResourceActions } from "../helpers/ResourceActions";
import { WithProjects, ProjectsContext } from "../helpers/ProjectsContext";
import { useContext } from "react";

type Dashboard = {
  id: number;
  name: string;
  description: string;
  pinned: boolean;
  is_shared: boolean;
  deleted: boolean;
  created_at: string;
  created_by: {
    email: string;
  };
};

function Dashboards() {
  return (
    <ProjectResourceList<Dashboard> endpoint="dashboards" searchBarPlaceholder="Search dashboards..." isShowingDetail>
      {(dashboards) => dashboards.map((dashboard) => <ResultsListSection key={dashboard.id} dashboard={dashboard} />)}
    </ProjectResourceList>
  );
}

const ResultsListSection = ({ dashboard }: { dashboard: Dashboard }) => {
  const { selectedAccount } = useContext(ProjectsContext);
  const appUrl = buildAppUrl(`dashboard/${dashboard.id}`, selectedAccount);

  return (
    <List.Item
      key={dashboard.id}
      title={dashboard.name}
      detail={
        <List.Item.Detail
          metadata={
            <List.Item.Detail.Metadata>
              <List.Item.Detail.Metadata.Label title="Name" text={dashboard.name} />
              <List.Item.Detail.Metadata.Separator />
              {dashboard.description && (
                <>
                  <List.Item.Detail.Metadata.Label title="Description" text={dashboard.description} />
                  <List.Item.Detail.Metadata.Separator />
                </>
              )}
              <List.Item.Detail.Metadata.Label title="Pinned" text={dashboard.pinned.toString()} />
              <List.Item.Detail.Metadata.Separator />
              <List.Item.Detail.Metadata.Label title="Shared" text={dashboard.is_shared.toString()} />
              <List.Item.Detail.Metadata.Separator />
              <List.Item.Detail.Metadata.Label title="Created At" text={dashboard.created_at} />
              <List.Item.Detail.Metadata.Separator />
              {dashboard.created_by && (
                <>
                  <List.Item.Detail.Metadata.Label title="Created By" text={dashboard.created_by.email} />
                  <List.Item.Detail.Metadata.Separator />
                </>
              )}
              <List.Item.Detail.Metadata.Label title="Deleted" text={dashboard.deleted.toString()} />
            </List.Item.Detail.Metadata>
          }
        />
      }
      actions={<ResourceActions title={dashboard.name} url={appUrl} />}
    />
  );
};

export default function Command() {
  return (
    <WithProjects>
      <Dashboards />
    </WithProjects>
  );
}
