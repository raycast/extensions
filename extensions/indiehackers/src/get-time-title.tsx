export default function getTimeTitle(time: Arguments.BrowseByTime["time"]) {
  switch (time) {
    case "today":
      return "today's";
    case "week":
      return `this week's`;
    case "month":
      return `this month's`;
    case "all-time":
      return "all-time";
  }
}
