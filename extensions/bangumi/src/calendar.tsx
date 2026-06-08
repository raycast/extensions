import { Grid, Icon, ActionPanel, Action } from "@raycast/api"
import { usePromise, withAccessToken } from "@raycast/utils"
import { bangumi } from "@/api/bangumi"
import { bangumiAuth } from "@/api/oauth"
import SubjectDetail from "@/components/SubjectDetail"
import { OpenInBgmBrowser } from "@/components/actions"

import { useRef } from "react"

const getImageUrl = (url?: string) => {
  if (!url) return undefined
  return url.replace(/^http:\/\//i, "https://")
}

const Calendar = () => {
  const abortable = useRef<AbortController>(null)
  const { data, isLoading } = usePromise(
    async () => {
      return bangumi.getCalendar(abortable.current?.signal)
    },
    [],
    { abortable }
  )

  const todayId = new Date().getDay() || 7

  return (
    <Grid isLoading={isLoading} searchBarPlaceholder="Search 'today' or '今天' to filter today's schedule">
      {data?.map((day) => {
        const isToday = day.weekday?.id === todayId
        return (
          <Grid.Section title={`${day.weekday?.en}${isToday ? " (Today)" : ""}`} key={day.weekday?.id}>
            {day.items?.map((item) => {
              return (
                <Grid.Item
                  key={item.id}
                  keywords={isToday ? ["today", "今天"] : undefined}
                  content={getImageUrl(item.images?.common) || Icon.Image}
                  title={item.name_cn || item.name || `Subject ${item.id}`}
                  subtitle={item.name}
                  actions={
                    <ActionPanel>
                      <Action.Push
                        title="Show Details"
                        target={<SubjectDetail subjectId={item.id} />}
                        icon={Icon.Sidebar}
                      />
                      <OpenInBgmBrowser url={item.url} path={`subject/${item.id}`} />
                    </ActionPanel>
                  }
                />
              )
            })}
          </Grid.Section>
        )
      })}
    </Grid>
  )
}

export default withAccessToken(bangumiAuth)(Calendar)
