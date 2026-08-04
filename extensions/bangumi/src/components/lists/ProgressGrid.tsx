import { Action, ActionPanel, Grid, Icon, showToast, Toast } from "@raycast/api"
import { usePromise, showFailureToast } from "@raycast/utils"
import { useState, useRef } from "react"
import { EpisodeCollectionType, EpisodeCollectionTypeName, EpisodeType, EpisodeTypePrefix } from "@/shared/const"
import type { components } from "@/types/generated"
import { EpisodeStatusActions } from "@/components/actions"
import { EpisodeDetail } from "@/components/details"
import { bangumi } from "@/api"
import { getSubjectDisplay } from "@/shared/utils"

interface ProgressGridProps {
  subjectId: number
  subjectName?: string
  epStatus: number
  totalEps?: number
}

type Episode = components["schemas"]["Episode"]

const getEpisodeLabel = (ep: Episode) => `${EpisodeTypePrefix[ep.type as EpisodeType] ?? "EP"}.${ep.sort}`

interface EpAppearance {
  bg: string
  color: string
  textDeco: string
}

const getEpisodeAppearance = (ep: Episode, collectionType: EpisodeCollectionType): EpAppearance => {
  if (collectionType === EpisodeCollectionType.Dropped) {
    return { bg: "#555555", color: "#FFFFFF", textDeco: "line-through" }
  }
  if (collectionType === EpisodeCollectionType.Watched) {
    return { bg: "#4997FF", color: "#FFFFFF", textDeco: "none" }
  }
  if (collectionType === EpisodeCollectionType.Wish) {
    return { bg: "#C7E2BD", color: "#3A7D22", textDeco: "none" }
  }

  // sv-SE locale formats as YYYY-MM-DD in local time, matching the airdate format
  const todayStr = new Date().toLocaleDateString("sv-SE")
  const isToday = ep.airdate === todayStr

  if (isToday) {
    return { bg: "#C7E2BD", color: "#3A7D22", textDeco: "none" }
  }

  const isAired = ep.airdate ? ep.airdate <= todayStr : false

  if (isAired) {
    return { bg: "#DAEBFF", color: "#4997FF", textDeco: "none" }
  } else {
    return { bg: "#E0E0E0", color: "#666666", textDeco: "none" }
  }
}

const buildEpisodeIcon = (text: string, appearance: EpAppearance): string => {
  const { bg, color, textDeco } = appearance
  const lineStr =
    textDeco === "line-through" ? `<line x1="12" y1="32" x2="52" y2="32" stroke="${color}" stroke-width="2" />` : ""
  const svg = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">`,
    `<rect x="0" y="0" width="64" height="64" rx="10" fill="${bg}"/>`,
    `<text x="32" y="32" text-anchor="middle" dominant-baseline="central" text-decoration="${textDeco}"`,
    `  font-family="system-ui,-apple-system,sans-serif" font-size="${text.length > 3 ? "13" : "22"}" font-weight="700" fill="${color}">`,
    `  ${text}`,
    `</text>`,
    lineStr,
    `</svg>`,
  ].join("")

  return `data:image/svg+xml;base64,${btoa(svg)}`
}

const getEpisodeTooltip = (statusType: EpisodeCollectionType, airdate?: string): string | undefined => {
  const statusName = EpisodeCollectionTypeName[statusType]
  if (!airdate || statusType === EpisodeCollectionType.Watched) return statusName

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const [y, m, d] = airdate.split("-").map(Number)
  if (!y || !m || !d) {
    return statusName ? `${statusName} · ${airdate}` : airdate
  }
  const airDateObj = new Date(y, m - 1, d)

  const diffTime = airDateObj.getTime() - today.getTime()
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24))

  let dateText = airdate
  if (diffDays === 0) {
    dateText = "Today"
  } else if (diffDays === 1) {
    dateText = "Tomorrow"
  } else if (diffDays > 1 && diffDays <= 7) {
    dateText = `In ${diffDays} days`
  } else if (diffDays === -1) {
    dateText = "Yesterday"
  }

  return statusName ? `${statusName} · ${dateText}` : dateText
}

const fetchTotalMainEpisodes = async (subjectId: number, signal?: AbortSignal): Promise<number | undefined> => {
  try {
    const response = await bangumi.getUserSubjectEpisodeCollection({
      subjectId,
      query: { limit: 1, offset: 0, episode_type: EpisodeType.Main },
      signal,
    })
    return response.total
  } catch {
    return undefined
  }
}

export default function ProgressGrid({ subjectId, subjectName, epStatus, totalEps }: ProgressGridProps) {
  const [fetchedTotalEps, setFetchedTotalEps] = useState<number | undefined>()
  const abortable = useRef<AbortController>(null)

  const {
    data: episodes = [],
    isLoading,
    mutate,
    pagination,
  } = usePromise(
    (id: number, eps?: number) => async (options: { page: number }) => {
      const limit = 100
      const offset = options.page * limit
      const signal = abortable.current?.signal
      const { data = [], total } = await bangumi.getUserSubjectEpisodeCollection({
        subjectId: id,
        query: { limit, offset },
        signal,
      })
      if (options.page === 0 && !eps) {
        fetchTotalMainEpisodes(id, signal).then((totalEps) => {
          if (signal?.aborted) return
          setFetchedTotalEps(totalEps)
        })
      }
      return {
        data,
        hasMore: offset + limit < total,
      }
    },
    [subjectId, totalEps],
    { abortable }
  )

  const handleUpdateStatus = async (episodeId: number, status: EpisodeCollectionType) => {
    if (episodes.length === 0) return
    const toast = await showToast({ style: Toast.Style.Animated, title: "Updating status..." })
    try {
      await mutate(bangumi.updateEpisodeCollection({ episodeId, type: status }), {
        optimisticUpdate: (currentData) => {
          const dataToUpdate = currentData ?? episodes
          return dataToUpdate.map((item) => (item.episode.id === episodeId ? { ...item, type: status } : item))
        },
      })
      toast.style = Toast.Style.Success
      toast.title = "Updated successfully"
    } catch (e) {
      await showFailureToast(e, { title: "Failed to update" })
    }
  }

  const handleBatchUpdateStatus = async (episodesToUpdate: number[], status: EpisodeCollectionType) => {
    if (episodes.length === 0) return
    const toast = await showToast({ style: Toast.Style.Animated, title: "Batch updating status..." })
    try {
      const idsSet = new Set(episodesToUpdate)
      await mutate(bangumi.updateSubjectEpisodesCollection({ subjectId, episodeIds: episodesToUpdate, type: status }), {
        optimisticUpdate: (currentData) => {
          const dataToUpdate = currentData ?? episodes
          return dataToUpdate.map((item) => (idsSet.has(item.episode.id) ? { ...item, type: status } : item))
        },
      })
      toast.style = Toast.Style.Success
      toast.title = "Batch updated successfully"
    } catch (e) {
      await showFailureToast(e, { title: "Failed to batch update" })
    }
  }

  const actualTotalEps = totalEps || fetchedTotalEps

  const title = subjectName
  const displayEpStatus =
    episodes.length > 0
      ? episodes.filter((ep) => ep.episode.type === EpisodeType.Main && ep.type === EpisodeCollectionType.Watched)
          .length
      : epStatus

  const percent = actualTotalEps ? parseFloat(((displayEpStatus / actualTotalEps) * 100).toFixed(1)) : 0
  const progressText = actualTotalEps ? `${displayEpStatus}/${actualTotalEps} (${percent}%)` : `${displayEpStatus}`

  const sortedEps = [...episodes].sort((a, b) => {
    if (a.episode.type !== b.episode.type) {
      return a.episode.type - b.episode.type
    }
    return a.episode.sort - b.episode.sort
  })

  const [selectedId, setSelectedId] = useState<string>()

  const selectedEp = selectedId ? sortedEps.find((ep) => String(ep.episode.id) === selectedId) : undefined

  const currentEp = selectedEp ?? sortedEps[0]
  const searchPlaceholder = currentEp
    ? `${getEpisodeLabel(currentEp.episode)} — ${getSubjectDisplay(currentEp.episode.name, currentEp.episode.name_cn).title}`
    : "Loading…"

  const groupedEps = sortedEps.reduce(
    (acc, ep) => {
      const type = ep.episode.type
      if (!acc[type]) {
        acc[type] = []
      }
      acc[type].push(ep)
      return acc
    },
    {} as Record<number, typeof sortedEps>
  )

  const sortedTypes = Object.keys(groupedEps)
    .map(Number)
    .sort((a, b) => a - b)

  return (
    <Grid
      isLoading={isLoading}
      navigationTitle={`${title} · ${progressText}`}
      columns={8}
      onSelectionChange={(id) => setSelectedId(id ?? undefined)}
      searchBarPlaceholder={searchPlaceholder}
      pagination={pagination}
    >
      {sortedTypes.map((type) => (
        <Grid.Section key={type} title={EpisodeTypePrefix[type as EpisodeType] || "Other"}>
          {groupedEps[type]?.map((ep) => {
            const epTitle = getSubjectDisplay(ep.episode.name, ep.episode.name_cn).title
            const epLabel = getEpisodeLabel(ep.episode)
            const epNum = String(ep.episode.sort)
            const statusType = ep.type
            return (
              <Grid.Item
                id={String(ep.episode.id)}
                key={ep.episode.id}
                content={{
                  source: buildEpisodeIcon(epNum, getEpisodeAppearance(ep.episode, statusType)),
                  tooltip: getEpisodeTooltip(statusType, ep.episode.airdate),
                }}
                keywords={[epLabel, epTitle]}
                actions={
                  <ActionPanel>
                    <Action.Push
                      title="View Details"
                      icon={Icon.BlankDocument}
                      target={<EpisodeDetail episode={ep.episode} />}
                    />
                    <EpisodeStatusActions
                      episode={ep.episode}
                      statusType={statusType}
                      onUpdateStatus={handleUpdateStatus}
                      onBatchUpdateStatus={handleBatchUpdateStatus}
                      sortedEps={sortedEps}
                    />
                  </ActionPanel>
                }
              />
            )
          })}
        </Grid.Section>
      ))}
    </Grid>
  )
}
