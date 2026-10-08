import { Action, ActionPanel, List } from "@raycast/api";
import { getColorByFileType, getObservationIcon } from "../helpers";
import { Observation } from "../types";
import { ObservationView } from "../views/ObservationView";

export function ObservationListItem(props: { observation: Observation; index: number }) {
  const { observation, index } = props;
  const { id, observation_id, file_type } = observation;
  const rowNumber = index + 1;
  const title = `${rowNumber}. Observation ${observation_id}`;
  const tagColor = getColorByFileType(file_type);

  return (
    <List.Item
      key={id}
      icon={getObservationIcon(observation)}
      title={title}
      accessories={[{ tag: { value: file_type, color: tagColor } }]}
      actions={
        <ActionPanel>
          <Action.Push title="View Observation" target={<ObservationView observation={observation} />} />
        </ActionPanel>
      }
    />
  );
}
