import { ActionPanel, Action, Icon, List, Detail } from "@raycast/api";
import { usePrograms } from "../hooks/usePrograms";
import { ObservationsByTypeView } from "./ObservationsByType";
import { ProgramView } from "./ProgramView";

export function AllProgramsView() {
  const { isLoading, data, error } = usePrograms();
  const programs = data?.body ?? [];

  if (error) {
    return <Detail markdown="Failed to load data, please try again later." />;
  }

  return (
    <List isLoading={isLoading}>
      <List.Item
        icon={Icon.BlankDocument}
        title="Get all observation by file type"
        actions={
          <ActionPanel>
            <Action.Push title="View Data" target={<ObservationsByTypeView />} />
          </ActionPanel>
        }
      />
      {programs.map((program) => {
        const programId = program.program;
        const title = `Program #${programId}`;

        return (
          <List.Item
            key={programId}
            icon={Icon.Box}
            title={title}
            actions={
              <ActionPanel>
                <Action.Push title="View Program" target={<ProgramView programId={programId} />} />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
