import { Action, ActionPanel, Icon, showToast, Toast } from "@raycast/api"
import { EpisodeCollectionType } from "@/api/bangumi"
import type { components } from "@/types/generated"

type Episode = components["schemas"]["Episode"]

interface Props {
  episode: Episode
  statusType: EpisodeCollectionType
  onUpdateStatus: (episodeId: number, status: EpisodeCollectionType) => void
  onBatchUpdateStatus: (episodesToUpdate: number[], status: EpisodeCollectionType) => void
  sortedEps: { episode: Episode; type: EpisodeCollectionType }[]
}

export const EpisodeStatusActions = ({
  episode,
  statusType,
  onUpdateStatus,
  onBatchUpdateStatus,
  sortedEps,
}: Props) => {
  return (
    <ActionPanel.Section title="Change Status">
      {statusType !== EpisodeCollectionType.Watched && (
        <Action
          title="Mark as 看过"
          icon={Icon.Checkmark}
          onAction={() => onUpdateStatus(episode.id, EpisodeCollectionType.Watched)}
        />
      )}
      {statusType !== EpisodeCollectionType.Watched && (
        <Action
          title="Mark up to Here as 看过"
          icon={Icon.CheckCircle}
          onAction={() => {
            const idsToUpdate = sortedEps
              .filter(
                (e) =>
                  e.episode.type === episode.type &&
                  e.episode.sort <= episode.sort &&
                  e.type !== EpisodeCollectionType.Watched
              )
              .map((e) => e.episode.id)
            if (idsToUpdate.length > 0) {
              onBatchUpdateStatus(idsToUpdate, EpisodeCollectionType.Watched)
            } else {
              showToast({ title: "Already marked as watched", style: Toast.Style.Success })
            }
          }}
        />
      )}
      {statusType !== EpisodeCollectionType.Wish && statusType !== EpisodeCollectionType.Watched && (
        <Action
          title="Mark as 想看"
          icon={Icon.Star}
          onAction={() => onUpdateStatus(episode.id, EpisodeCollectionType.Wish)}
        />
      )}
      {statusType !== EpisodeCollectionType.Dropped && statusType !== EpisodeCollectionType.Watched && (
        <Action
          title="Mark as 抛弃"
          icon={Icon.Trash}
          onAction={() => onUpdateStatus(episode.id, EpisodeCollectionType.Dropped)}
        />
      )}
      {statusType !== EpisodeCollectionType.NotCollected && (
        <Action
          title="Reset to 未看"
          icon={Icon.XMarkCircle}
          onAction={() => onUpdateStatus(episode.id, EpisodeCollectionType.NotCollected)}
        />
      )}
    </ActionPanel.Section>
  )
}
