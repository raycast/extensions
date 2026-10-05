import { Grid, Icon, ActionPanel, Action } from "@raycast/api"
import { usePromise, withAccessToken } from "@raycast/utils"
import { SubjectDetail } from "@/components/details"
import { OpenInBgmBrowser } from "@/components/actions"
import { getImageUrl, getSubjectDisplay } from "@/shared/utils"

import { useRef, useState } from "react"
import { bangumi, bangumiAuth } from "@/api"

const Calendar = () => {
  const [selectedDay, setSelectedDay] = useState<string>("all")
  const abortable = useRef<AbortController>(null)
  const { data, isLoading } = usePromise(
    async () => {
      return bangumi.getCalendar({ signal: abortable.current?.signal })
    },
    [],
    { abortable }
  )

  const todayId = new Date().getDay() || 7

  return (
    <Grid
      isLoading={isLoading}
      searchBarPlaceholder="Search subjects"
      searchBarAccessory={
        <Grid.Dropdown tooltip="Filter by Day" storeValue={true} onChange={setSelectedDay}>
          <Grid.Dropdown.Item title="All" value="all" />
          <Grid.Dropdown.Item title="Today" value="today" />
          <Grid.Dropdown.Section title="Days">
            <Grid.Dropdown.Item title="Monday" value="1" />
            <Grid.Dropdown.Item title="Tuesday" value="2" />
            <Grid.Dropdown.Item title="Wednesday" value="3" />
            <Grid.Dropdown.Item title="Thursday" value="4" />
            <Grid.Dropdown.Item title="Friday" value="5" />
            <Grid.Dropdown.Item title="Saturday" value="6" />
            <Grid.Dropdown.Item title="Sunday" value="7" />
          </Grid.Dropdown.Section>
        </Grid.Dropdown>
      }
    >
      {data
        ?.filter((day) => {
          if (selectedDay === "all") return true
          if (selectedDay === "today") return day.weekday?.id === todayId
          return day.weekday?.id?.toString() === selectedDay
        })
        .map((day) => {
          const isToday = day.weekday?.id === todayId
          return (
            <Grid.Section title={`${day.weekday?.en}${isToday ? " (Today)" : ""}`} key={day.weekday?.id}>
              {day.items?.map((item) => {
                const { title, subtitle } = getSubjectDisplay(item.name, item.name_cn, `Subject ${item.id}`)
                return (
                  <Grid.Item
                    key={item.id}
                    content={getImageUrl(item.images?.common) || Icon.Image}
                    title={title}
                    subtitle={subtitle}
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
