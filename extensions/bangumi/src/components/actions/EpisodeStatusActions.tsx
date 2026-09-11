import { Action, ActionPanel, Icon, showToast, Toast } from "@raycast/api"
import { EpisodeCollectionType } from "@/shared/const"
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
          title="Mark as Watched"
          icon={Icon.Checkmark}
          onAction={() => onUpdateStatus(episode.id, EpisodeCollectionType.Watched)}
        />
      )}
      {statusType !== EpisodeCollectionType.Watched && (
        <Action
          title="Mark up to Here as Watched"
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
          title="Mark as Wishlist"
          icon={Icon.Star}
          onAction={() => onUpdateStatus(episode.id, EpisodeCollectionType.Wish)}
        />
      )}
      {statusType !== EpisodeCollectionType.Dropped && statusType !== EpisodeCollectionType.Watched && (
        <Action
          title="Mark as Dropped"
          icon={Icon.Trash}
          onAction={() => onUpdateStatus(episode.id, EpisodeCollectionType.Dropped)}
        />
      )}
      {statusType !== EpisodeCollectionType.NotCollected && (
        <Action
          title="Reset to Unwatched"
          icon={Icon.XMarkCircle}
          onAction={() => onUpdateStatus(episode.id, EpisodeCollectionType.NotCollected)}
        />
      )}
    </ActionPanel.Section>
  )
}
