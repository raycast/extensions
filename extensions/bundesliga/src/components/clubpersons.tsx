import { Action, ActionPanel, List, Icon } from "@raycast/api";
import { usePersons } from "../hooks";
import { getFlagEmoji, positionMap } from "../utils";
import Person from "./person";

type PropsType = {
  club: string;
  navigationTitle: string;
};

export default function ClubPersons(props: PropsType) {
  const players = usePersons(props.club);

  return (
    <List navigationTitle={props.navigationTitle} throttle isLoading={!players}>
      {players &&
        Object.entries(players).map(([position, persons]) => {
          return (
            <List.Section key={position} title={positionMap.get(position)}>
              {persons.map((person, idx) => {
                const props: Partial<List.Item.Props> = {
                  accessories: [
                    {
                      icon: getFlagEmoji(
                        person.nationality.firstNationalityCode
                      ),
                    },
                  ],
                };

                if (person.nationality.secondNationalityCode) {
                  props.accessories?.push({
                    icon: getFlagEmoji(
                      person.nationality.secondNationalityCode
                    ),
                  });
                }
                if (person.nationality.thirdNationalityCode) {
                  props.accessories?.push({
                    icon: getFlagEmoji(person.nationality.thirdNationalityCode),
                  });
                }
                return (
                  <List.Item
                    key={position + idx}
                    title={person.shirtNumber}
                    subtitle={person.name.full}
                    keywords={[person.name.full]}
                    icon={{
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
            </List.Section>
          );
        })}
    </List>
  );
}
