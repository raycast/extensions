import { useState, useEffect } from "react";
import { List } from "@raycast/api";
import { ActivityListItem } from "./ActivityListItem";
import { fetchUser } from "../../user/api";
import { User } from "../../user/types";
import { fetchActivities } from "../api";
import { Activity } from "../types";

export enum Actions {
  update,
  delete,
}

export const ActivityList = ({ projectID = null }: { projectID?: number | null }) => {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [user, setUser] = useState<User>();
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const lookbackDays = projectID ? 7 : 0;

  const refreshUser = async () => {
    const user = await fetchUser();
    setUser(user);
    return user;
  };

  const refreshItems = async (user: User) => {
    setIsLoading(true);
    setActivities(await fetchActivities(projectID, lookbackDays, user.id));
    setIsLoading(false);
  };

  useEffect(() => {
    refreshUser().then((user) => refreshItems(user));
  }, []);

  function modifyActivity(index: number, newValue: Activity, action: Actions): void {
    switch (action) {
      case Actions.update:
        updateActivity(index, newValue);
        break;
      case Actions.delete:
        deleteActivity(index);
        break;
    }
    refreshUser().then((user) => refreshItems(user));
  }

  function updateActivity(index: number, newValue: Activity): void {
    const updatedActivities = [...activities];
    updatedActivities[index] = newValue;
    setActivities(updatedActivities);
  }

  function deleteActivity(index: number): void {
    const updatedActivities = [...activities];
    updatedActivities.splice(index, 1);
    setActivities(updatedActivities);
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Filter tasks by name..." isShowingDetail={true}>
      {activities.map((activity, index) => (
        <ActivityListItem key={index} index={index} activity={activity} modifyActivity={modifyActivity} />
      ))}
    </List>
  );
};
