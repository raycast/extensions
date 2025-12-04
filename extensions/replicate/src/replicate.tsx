import { ActionPanel, Action, getPreferenceValues, List, Icon } from "@raycast/api";
import RenderForm from "./components/Form";
import ViewPredictions from "./viewPredictions";

export default function Command() {
  const { token } = getPreferenceValues();

  return (
    <>
      <List>
        <List.Item
          icon={{
            source:
              "https://user-images.githubusercontent.com/14149230/223854538-71327569-76b5-4f77-903c-edf205569927.png",
          }}
          title="Run a Model"
          actions={
            <ActionPanel>
              <Action.Push title="Show Details" target={<RenderForm token={token} modelName={"stable-diffusion"} />} />
            </ActionPanel>
          }
        />
        <List.Item
          icon={{
            source:
              "https://user-images.githubusercontent.com/14149230/223854538-71327569-76b5-4f77-903c-edf205569927.png",
          }}
          title="View Predictions"
          actions={
            <ActionPanel>
              <Action.Push title="View Predictions" target={<ViewPredictions />} />
            </ActionPanel>
          }
        />
        <List.Item
          icon={{
            source:
              "https://user-images.githubusercontent.com/14149230/223854538-71327569-76b5-4f77-903c-edf205569927.png",
          }}
          title="Explore Models"
          accessories={[{ icon: Icon.ArrowNe }]}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser title="Show Details" url={"https://replicate.com/collections/diffusion-models"} />
            </ActionPanel>
          }
        />
        <List.Item
          icon={{
            source:
              "https://user-images.githubusercontent.com/14149230/223854538-71327569-76b5-4f77-903c-edf205569927.png",
          }}
          title="Dashboard"
          accessories={[{ icon: Icon.ArrowNe }]}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser url="https://replicate.com" />
            </ActionPanel>
          }
        />
        <List.Item
          icon={{
            source:
              "https://user-images.githubusercontent.com/14149230/223854538-71327569-76b5-4f77-903c-edf205569927.png",
          }}
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
