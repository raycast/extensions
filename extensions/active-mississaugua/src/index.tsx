import { List } from "@raycast/api";
import { ActivityModel } from "./interface/ActivityModel";
import { useEffect, useState } from "react";
import fetch from "node-fetch";
import { activityListItem } from "./components/components";

export default function Command() {
  const [activities, setActivities] = useState<ActivityModel[]>([]);
  const [isLoading, setLoading] = useState(false);

  const fetchActivities = async () => {
    setLoading(true);
    const response = await fetch("https://www.activemississauga.ca/RegisteredProgram");
    const data = (await response.json()) as ActivityModel[];
    setActivities(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchActivities();
  }, []);

  return (
    <List enableFiltering={true} isShowingDetail={!isLoading && activities.length !== 0} isLoading={isLoading}>
      {activities.map((activity) => {
        return activityListItem(activity);
      })}
    </List>
  );
}
