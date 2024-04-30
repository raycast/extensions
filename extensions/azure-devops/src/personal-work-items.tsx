import WorkItemList from "./components/WorkItemList";
import { RecentWorkItems } from "./utils/enums";

export default function Command() {
  return <WorkItemList recentItems={RecentWorkItems.AssignedToMe} />;
}
