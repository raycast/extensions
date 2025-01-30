import { List, Detail } from "@raycast/api";
import { useProgramObservations } from "../hooks/useProgramObservations";
import { ObservationListItem } from "../components/ObservationListItem";

type ProgramViewProps = {
  programId: number;
};

export function ProgramView(props: ProgramViewProps) {
  const { programId } = props;

  const { isLoading, data, pagination, error } = useProgramObservations({ programId });
  const observations = data ?? [];

  if (error) {
    return <Detail markdown="Failed to load data, please try again later." />;
  }

  return (
    <List isLoading={isLoading} pagination={pagination}>
      {observations.map((observation, index) => {
        return <ObservationListItem key={observation.id} observation={observation} index={index} />;
      })}
    </List>
  );
}
