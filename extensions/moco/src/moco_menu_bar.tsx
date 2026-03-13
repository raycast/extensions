import { Icon, MenuBarExtra } from "@raycast/api";
import { useState, useEffect } from "react";
import { fetchUser } from "./commands/user/api";
import { User } from "./commands/user/types";
import { fetchActivities, toggleActivity } from "./commands/activities/api";
import { Activity } from "./commands/activities/types";
import { timeDelta, secondsParser } from "./commands/activities/utils";

export default function Command() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [user, setUser] = useState<User>();
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const refreshUser = async () => {
    const user = await fetchUser();
    setUser(user);
    return user;
  };

  const refreshItems = async (user: User) => {
    setActivities(await fetchActivities(null, 0, user.id));
  };

  useEffect(() => {
    setIsLoading(true);
    refreshUser()
      .then((user) => refreshItems(user))
      .then(() => setIsLoading(false));
  }, []);

  const runningActivity = activities.find((activity) => activity.timer_started_at !== null);

  function sumUpActivities(activities: Activity[]) {
    const secondSum = activities.reduce((acc, activity) => acc + activity.seconds, 0);

    if (runningActivity !== undefined && runningActivity.timer_started_at !== null) {
      return secondsParser(secondSum + timeDelta(runningActivity.timer_started_at));
    }

    return secondsParser(secondSum);
  }

  return (
    <MenuBarExtra
      isLoading={isLoading}
      icon={{ source: runningActivity ? "MocoLogoRunning.png" : "MocoLogo.png" }}
      tooltip={`Timer ${runningActivity ? "Running" : "Not running"}`}
    >
      <MenuBarExtra.Item icon={Icon.Stopwatch} title={`Total Time: ${sumUpActivities(activities)}`} />

      {runningActivity ? (
        <MenuBarExtra.Item
          icon={Icon.Stop}
          title="Stop Timer"
          tooltip={`Project: ${runningActivity.project.name}\nTask: ${runningActivity.task.name}\nDescription: ${runningActivity.description}`}
          subtitle={runningActivity.task.name}
          onAction={() => toggleActivity(runningActivity.id, false).then(() => refreshItems(user!))}
        />
      ) : null}
    </MenuBarExtra>
  );
}
