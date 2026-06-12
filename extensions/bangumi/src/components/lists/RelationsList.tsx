import { Action, ActionPanel, Color, Icon, List } from "@raycast/api"
import { SubjectDetail } from "@/components/details"
import { SubjectTypeName, SubjectType } from "@/shared/const"

export interface RelationItem {
  id: number
  name: string
  name_cn: string
  image?: string
  relationType?: string
  subjectType?: number
}

interface RelationsListProps {
  relations: RelationItem[]
  title?: string
}

const getRelationColor = (relation: string): Color => {
  switch (relation) {
    case "主角":
    case "前传":
    case "续集":
    case "主线故事":
    case "番外篇":
      return Color.Red
    case "配角":
    case "相同世界观":
    case "衍生":
      return Color.Blue
    case "客串":
    case "不同演绎":
      return Color.Orange
    default:
      return Color.SecondaryText
  }
}

export default function RelationsList({ relations, title = "Related Subjects" }: RelationsListProps) {
  return (
    <List navigationTitle={title} searchBarPlaceholder="Filter related items...">
      {relations.map((relation) => (
        <List.Item
          key={relation.id}
          icon={relation.image || Icon.Image}
          title={relation.name_cn || relation.name}
          subtitle={relation.name !== relation.name_cn ? relation.name : undefined}
          accessories={[
            ...(relation.relationType
              ? [{ tag: { value: relation.relationType, color: getRelationColor(relation.relationType) } }]
              : []),
            ...(relation.subjectType && SubjectTypeName[relation.subjectType as SubjectType]
              ? [
                  {
                    tag: {
                      value: SubjectTypeName[relation.subjectType as SubjectType],
                      color: Color.SecondaryText,
                    },
                  },
                ]
              : []),
          ]}
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
      ))}
    </List>
  )
}
