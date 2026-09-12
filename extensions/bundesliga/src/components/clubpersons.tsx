import { Action, ActionPanel, Grid, Icon } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { getPersons } from "../api";
import { positionMap } from "../utils";
import Person from "./person";

type PropsType = {
  club: string;
  navigationTitle: string;
};

export default function ClubPersons(props: PropsType) {
  const { data: players, isLoading } = usePromise(getPersons, [props.club]);

  return (
    <Grid
      navigationTitle={props.navigationTitle}
      throttle
      isLoading={isLoading}
    >
      {players &&
        Object.entries(players).map(([position, persons]) => {
          return (
            <Grid.Section key={position} title={positionMap.get(position)}>
              {persons.map((person, idx) => {
                return (
                  <Grid.Item
                    key={position + idx}
                    title={person.name.full}
                    subtitle={person.nationality.firstNationality}
                    content={{
                      source: person.playerImages.FACE_CIRCLE,
                      fallback: "player-circle-default.png",
                    }}
                    {...props}
                    actions={
                      <ActionPanel>
                        <Action.Push
                          title="Player Profile"
                          icon={Icon.Sidebar}
                          target={<Person {...person.name} />}
                        />
                      </ActionPanel>
                    }
                  />
                );
              })}
            </Grid.Section>
          );
        })}
    </Grid>
  );
}
