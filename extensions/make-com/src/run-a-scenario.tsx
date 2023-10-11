import { List } from "@raycast/api";
import ScenarioActions from "./components/ScenarioActions";
import useMake from "./hooks/useMake";

export default function Command() {
  const { scenarios } = useMake();

  return (
    <List>
      {scenarios &&
        scenarios.map((scenario) => {
          const { id, teamId, name } = scenario;

          return (
            <List.Item
              title={name}
              id={id.toString()}
              key={id}
              actions={<ScenarioActions scenarioId={id} teamId={teamId} />}
            />
          );
        })}
    </List>
  );
}
