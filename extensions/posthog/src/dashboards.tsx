import { List } from "@raycast/api";
import { useUrl } from "../helpers/useUrl";
import { WithProjects } from "../helpers/ProjectsContext";
import { ResourceActions } from "../helpers/ResourceActions";
import { ProjectResourceList } from "../helpers/ProjectResourceList";

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

function Cohorts() {
  return (
    <ProjectResourceList<Dashboard> endpoint="dashboards" searchBarPlaceholder="Search dashboards..." isShowingDetail>
      {(dashboards) => dashboards.map((dashboard) => <ResultsListSection key={dashboard.id} dashboard={dashboard} />)}
    </ProjectResourceList>
  );
}

const ResultsListSection = ({ dashboard }: { dashboard: Dashboard }) => {
  const appUrl = useUrl(`dashboard/${dashboard.id}`);

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
      <Cohorts />
    </WithProjects>
  );
}
