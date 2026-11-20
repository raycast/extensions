import { ActionPanel, Action, List, Icon } from "@raycast/api";
import { ManageAIModels } from "./views/ManageAIModels";
import { ModelList } from "./views/ModelList";
import ViewPredictions from "./viewPredictions";

export default function Command() {
  return (
    <>
      <List>
        <List.Item
          icon={{ source: "replicate.png" }}
          title="Run a Model"
          actions={
            <ActionPanel>
              <Action.Push icon={Icon.Play} title="Run a Model" target={<ModelList />} />
            </ActionPanel>
          }
        />
        <List.Item
          icon={{ source: "replicate.png" }}
          title="View Predictions"
          actions={
            <ActionPanel>
              <Action.Push title="View Predictions" target={<ViewPredictions />} />
            </ActionPanel>
          }
        />
        <List.Item
          icon={{ source: "replicate.png" }}
          title="Raycast AI Models"
          subtitle="Choose what Raycast AI offers"
          actions={
            <ActionPanel>
              <Action.Push title="Raycast AI Models" target={<ManageAIModels />} />
            </ActionPanel>
          }
        />
        <List.Item
          icon={{ source: "replicate.png" }}
          title="Explore Models"
          accessories={[{ icon: Icon.ArrowNe }]}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser url="https://replicate.com/explore" />
            </ActionPanel>
          }
        />
        <List.Item
          icon={{ source: "replicate.png" }}
          title="Dashboard"
          accessories={[{ icon: Icon.ArrowNe }]}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser url="https://replicate.com" />
            </ActionPanel>
          }
        />
        <List.Item
          icon={{ source: "replicate.png" }}
          title="Docs"
          accessories={[{ icon: Icon.ArrowNe }]}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser url="https://replicate.com/docs" />
            </ActionPanel>
          }
        />
      </List>
    </>
  );
}
