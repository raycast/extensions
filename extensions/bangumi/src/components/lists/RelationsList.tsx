import { Action, ActionPanel, Color, Icon, List } from "@raycast/api"
import { SubjectDetail } from "@/components/details"
import { SubjectTypeName, SubjectType } from "@/shared/const"
import { getRelationColor, getSubjectDisplay, translateBangumiLabel } from "@/shared/utils"
import { usePromise } from "@raycast/utils"
import { bangumi } from "@/api"
import { useRef } from "react"

export interface RelationItem {
  id: number
  name: string
  name_cn: string
  image?: string
  relationType?: string
  subjectType?: number
}

interface RelationsListBaseProps {
  title: string
  relations?: RelationItem[]
  isLoading: boolean
}

const RelationsListBase = ({ title, relations, isLoading }: RelationsListBaseProps) => {
  return (
    <List isLoading={isLoading} navigationTitle={title} searchBarPlaceholder="Filter related items...">
      {relations?.map((relation) => {
        const accessories: List.Item.Accessory[] = []
        const { title: itemTitle, subtitle } = getSubjectDisplay(relation.name, relation.name_cn)

        if (relation.relationType) {
          accessories.push({
            tag: {
              value: translateBangumiLabel(relation.relationType),
              color: getRelationColor(relation.relationType),
            },
          })
        }

        if (relation.subjectType && SubjectTypeName[relation.subjectType as SubjectType]) {
          accessories.push({
            tag: { value: SubjectTypeName[relation.subjectType as SubjectType], color: Color.SecondaryText },
          })
        }

        return (
          <List.Item
            key={relation.id}
            icon={relation.image || Icon.Image}
            title={itemTitle}
            subtitle={subtitle}
            accessories={accessories}
            actions={
              <ActionPanel>
                <Action.Push
                  title="Show Details"
                  icon={Icon.Sidebar}
                  target={<SubjectDetail subjectId={relation.id} />}
                />
              </ActionPanel>
            }
          />
        )
      })}
    </List>
  )
}

interface SubjectRelationsListProps {
  subjectId: number
  title?: string
}

export const SubjectRelationsList = ({ subjectId, title = "Related Subjects" }: SubjectRelationsListProps) => {
  const abortable = useRef<AbortController>(null)

  const { data: relations, isLoading } = usePromise(
    async (sId: number) => {
      const res = await bangumi.getRelatedSubjectsBySubjectId({ subjectId: sId, signal: abortable.current?.signal })
      return res.map((rel) => ({
        id: rel.id,
        name: rel.name,
        name_cn: rel.name_cn,
        image: rel.images?.grid,
        relationType: rel.relation,
        subjectType: rel.type,
      }))
    },
    [subjectId],
    { abortable }
  )

  return <RelationsListBase title={title} relations={relations} isLoading={isLoading} />
}

interface CharacterRelationsListProps {
  characterId: number
  title?: string
}

export const CharacterRelationsList = ({ characterId, title = "Related Works" }: CharacterRelationsListProps) => {
  const abortable = useRef<AbortController>(null)

  const { data: relations, isLoading } = usePromise(
    async (cId: number) => {
      const res = await bangumi.getRelatedSubjectsByCharacterId({
        characterId: cId,
        signal: abortable.current?.signal,
      })
      return res.map((sub) => ({
        id: sub.id,
        name: sub.name,
        name_cn: sub.name_cn,
        image: sub.image,
        relationType: sub.staff,
        subjectType: sub.type,
      }))
    },
    [characterId],
    { abortable }
  )

  return <RelationsListBase title={title} relations={relations} isLoading={isLoading} />
}
