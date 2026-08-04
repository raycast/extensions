import { Action, ActionPanel, showToast, Toast } from "@raycast/api"
import { showFailureToast } from "@raycast/utils"
import { SubjectCollectionType, SubjectType, SubjectCollectionIcon } from "@/shared/const"
import { getCollectionTag } from "@/shared/utils"
import { bangumi } from "@/api"

interface Props {
  subjectId: number
  subjectType?: SubjectType
  currentStatus?: SubjectCollectionType
  onStatusChange?: () => void
}

export const CollectionStatusActions = ({
  subjectId,
  subjectType = SubjectType.Anime,
  currentStatus,
  onStatusChange,
}: Props) => {
  const handleStatusChange = async (type: SubjectCollectionType) => {
    try {
      await showToast({ title: "Updating collection...", style: Toast.Style.Animated })
      await bangumi.updateSubjectCollection({ subjectId, type })
      if (onStatusChange) {
        onStatusChange()
      }
      await showToast({ title: "Updated collection successfully", style: Toast.Style.Success })
    } catch (e) {
      await showFailureToast(e, { title: "Failed to update collection" })
    }
  }

  return (
    <ActionPanel.Section title="Change Status">
      {[
        SubjectCollectionType.Wish,
        SubjectCollectionType.Doing,
        SubjectCollectionType.Collect,
        SubjectCollectionType.OnHold,
        SubjectCollectionType.Dropped,
      ].map((statusType) => {
        if (currentStatus === statusType) return null
        return (
          <Action
            key={statusType}
            title={`Mark as ${getCollectionTag(statusType, subjectType).value}`}
            icon={SubjectCollectionIcon[statusType]}
            onAction={() => handleStatusChange(statusType)}
          />
        )
      })}
    </ActionPanel.Section>
  )
}
