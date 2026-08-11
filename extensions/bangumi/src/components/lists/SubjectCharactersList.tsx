import { Action, ActionPanel, Color, Icon, List } from "@raycast/api"
import { CharacterDetail } from "@/components/details"
import { getRelationColor, translateBangumiLabel } from "@/shared/utils"
import { usePromise } from "@raycast/utils"
import { bangumi } from "@/api"
import { useRef } from "react"

interface SubjectCharactersListProps {
  subjectId: number
}

export default function SubjectCharactersList({ subjectId }: SubjectCharactersListProps) {
  const abortable = useRef<AbortController>(null)

  const { data: characters, isLoading } = usePromise(
    async (id: number) => {
      return bangumi.getSubjectCharacters({ subjectId: id, signal: abortable.current?.signal })
    },
    [subjectId],
    { abortable }
  )

  return (
    <List isLoading={isLoading} navigationTitle="Characters" searchBarPlaceholder="Filter characters...">
      {characters?.map((char) => {
        const cvs = char.actors.length ? char.actors.map((a) => a.name).join(", ") : "N/A"
        const accessories: List.Item.Accessory[] = [
          { tag: { value: translateBangumiLabel(char.relation), color: getRelationColor(char.relation) } },
        ]

        if (cvs !== "N/A") {
          accessories.push({ tag: { value: `CV: ${cvs}`, color: Color.Purple } })
        }

        return (
          <List.Item
            key={char.id}
            icon={char.images?.grid || Icon.Person}
            title={char.name}
            subtitle={char.summary}
            accessories={accessories}
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
