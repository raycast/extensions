import { Action, ActionPanel, Color, Icon, List } from "@raycast/api"
import { components } from "@/types/generated"
import CharacterDetail from "./CharacterDetail"

type RelatedCharacter = components["schemas"]["RelatedCharacter"]

interface SubjectCharactersListProps {
  characters: RelatedCharacter[]
}

const getRelationColor = (relation: string): Color => {
  switch (relation) {
    case "主角":
      return Color.Red
    case "配角":
      return Color.Blue
    case "客串":
      return Color.Orange
    default:
      return Color.SecondaryText
  }
}

export default function SubjectCharactersList({ characters }: SubjectCharactersListProps) {
  return (
    <List navigationTitle="Characters & Voice Actors" searchBarPlaceholder="Filter characters...">
      {characters.map((char) => {
        const cvs = char.actors?.length ? char.actors.map((a) => a.name).join(", ") : "N/A"
        return (
          <List.Item
            key={char.id}
            icon={char.images?.grid || Icon.Person}
            title={char.name}
            subtitle={char.summary}
            accessories={[
              { tag: { value: char.relation, color: getRelationColor(char.relation) } },
              ...(cvs !== "N/A" ? [{ tag: { value: `CV: ${cvs}`, color: Color.Purple } }] : []),
            ]}
            actions={
              <ActionPanel>
                <Action.Push
                  title="Show Character Details"
                  icon={Icon.Sidebar}
                  target={<CharacterDetail characterId={char.id} />}
                />
              </ActionPanel>
            }
          />
        )
      })}
    </List>
  )
}
