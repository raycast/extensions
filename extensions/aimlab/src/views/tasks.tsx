import { ActionPanel, Action, List, Icon } from "@raycast/api";
// import AuthorComponent from "../components/Creator";
import { useState } from "react";
import useTasks from "../hooks/useTasks";
import UserProfile from "./profile";
import TaskLeaderboardComponent from "../components/TaskLeaderboard";

const Tasks = () => {
  const [searchText, setSearchText] = useState(" ");
  const { data, isLoading } = useTasks(searchText);

  return (
    <List
      filtering={false}
      onSearchTextChange={setSearchText}
      navigationTitle="Search Beers"
      searchBarPlaceholder="Search for a Task"
      isLoading={isLoading}
      throttle
    >
      {data && data.length > 0 ? (
        <List.Section title={"Total Tasks: " + data.length}>
          {data.map((task, index) => (
            <List.Item
              key={task.id}
              title={task.name}
              accessories={[
                { icon: Icon.Hammer, text: task.weapon_id, tooltip: task.description },
                { icon: Icon.Person, text: task.author?.username },
                { icon: task.image_url, tooltip: task.author?.username },
              ]}
              actions={
                <ActionPanel title="Leaderboard Actions">
                  <Action.Push
                    title="Open Leaderboard"
                    icon={Icon.Leaderboard}
                    target={
                      <TaskLeaderboardComponent taskId={task.id} taskName={task.name} weaponId={task.weapon_id} />
                    }
                  />
                  <Action.Push
                    title="Show Player Details"
                    icon={Icon.ArrowRight}
                    target={<UserProfile username={task.author?.username} />}
                  />
                  <Action.OpenInBrowser
                    title="View Player on Aimlab"
                    url={"https://aimlab.gg/u/" + encodeURIComponent(task.author?.username)}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ) : (
        <List.EmptyView
          icon="logo.png"
          title={searchText ? `No tasks found with name ${searchText}` : "Please enter a valid task"}
          description="Please visit the website instead"
          actions={
            <ActionPanel>
              <Action.OpenInBrowser title="View Leaderboards on Aimlab" url={"https://aimlab.gg/aimlab/leaderboards"} />
            </ActionPanel>
          }
        />
      )}
    </List>
  );
};

export default Tasks;
