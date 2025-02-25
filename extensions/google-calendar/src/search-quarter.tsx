import View from "@components/view";
import { addDaysToDate, nowDate } from "@lib/utils";
import { EventRangeList } from "@components/eventrange/list";

function RootCommand() {
  const start = nowDate();
  const end = addDaysToDate(start, 90);
  return <EventRangeList start={start} end={end} />;
}

export default function Command() {
  return (
    <View>
      <RootCommand />
    </View>
  );
}
