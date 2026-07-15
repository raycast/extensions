import { List } from "@raycast/api";
import { useUrl } from "../helpers/useUrl";
import { WithProjects } from "../helpers/ProjectsContext";
import { ResourceActions } from "../helpers/ResourceActions";
import { ProjectResourceList } from "../helpers/ProjectResourceList";

type Cohort = {
  id: number;
  name: string;
  description: string;
  count: number;
  deleted: boolean;
  last_calculation: string;
  created_at: string;
  created_by: {
    email: string;
  };
};

function Cohorts() {
  return (
    <ProjectResourceList<Cohort> endpoint="cohorts" searchBarPlaceholder="Search cohorts..." isShowingDetail>
      {(cohorts) => cohorts.map((cohort) => <ResultsListSection key={cohort.id} cohort={cohort} />)}
    </ProjectResourceList>
  );
}

const ResultsListSection = ({ cohort }: { cohort: Cohort }) => {
  const appUrl = useUrl(`cohorts/${cohort.id}`);

  return (
    <List.Item
      key={cohort.id}
      title={cohort.name}
      detail={
        <List.Item.Detail
          metadata={
            <List.Item.Detail.Metadata>
              <List.Item.Detail.Metadata.Label title="Name" text={cohort.name} />
              <List.Item.Detail.Metadata.Separator />
              {cohort.description && (
                <>
                  <List.Item.Detail.Metadata.Label title="Description" text={cohort.description} />
                  <List.Item.Detail.Metadata.Separator />
                </>
              )}
              {cohort.count && (
                <>
                  <List.Item.Detail.Metadata.Label title="Count" text={cohort.count.toString()} />
                  <List.Item.Detail.Metadata.Separator />
                </>
              )}
              {cohort.last_calculation && (
                <>
                  <List.Item.Detail.Metadata.Label title="Last Calculation" text={cohort.last_calculation} />
                  <List.Item.Detail.Metadata.Separator />
                </>
              )}
              <List.Item.Detail.Metadata.Label title="Created At" text={cohort.created_at} />
              <List.Item.Detail.Metadata.Separator />
              <List.Item.Detail.Metadata.Label title="Created By" text={cohort.created_by.email} />
              <List.Item.Detail.Metadata.Separator />
              <List.Item.Detail.Metadata.Label title="Deleted" text={cohort.deleted.toString()} />
            </List.Item.Detail.Metadata>
          }
        />
      }
      actions={<ResourceActions title={cohort.name} url={appUrl} />}
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
