import { withAccessToken } from "@raycast/utils"
import { formatSubjectToMarkdown } from "./utils"
import { bangumi, bangumiAuth } from "@/api"

const tool = async () => {
  const result = await bangumi.getCalendar()
  const todayId = new Date().getDay() || 7

  const content = [
    "# Bangumi Daily Calendar\n",
    ...result.map((day) => {
      const isToday = day.weekday?.id === todayId
      const weekday = day.weekday?.en || "Unknown"
      const todayMark = isToday ? " (Today)" : ""
      const count = day.items?.length || 0

      const items = day.items?.map(formatSubjectToMarkdown).join("\n") || ""

      return `## ${weekday}${todayMark} (${count} items)\n\n${items}`
    }),
  ].join("\n")

  return content
}

export default withAccessToken(bangumiAuth)(tool)
