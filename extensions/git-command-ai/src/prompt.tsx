import { LaunchProps, Detail, Action, launchCommand, LaunchType, ActionPanel, Grid } from "@raycast/api";
import { CONFIG_STORAGE_KEY } from "./const";
import { Config } from "./types";
import { usePromptQuery } from "./hooks/usePromptQuery";
import packageJson from "../package.json";
import Settings from "./settings";
import { useLocalStorage } from "@raycast/utils";

export default function Command(props: LaunchProps<{ arguments: { description: string } }>) {
  const { value: config, isLoading: isConfigLoading } = useLocalStorage<Config>(CONFIG_STORAGE_KEY);

  if (isConfigLoading) {
    return <Detail markdown="Loading..." />;
  }

  return <Prompt query={props.arguments.description} config={config} />;
}

function Prompt({ query, config }: { query: string; config: Config | undefined }) {
  const { data, isLoading, error } = usePromptQuery({ query, config });

  if (error) {
    return (
      <Grid>
        <Grid.EmptyView
          title="No API key found"
          description="Please open the settings and add your API key."
          actions={
            <ActionPanel>
              <Action.Push
                target={<Settings />}
                title="Open Settings"
                onPush={() => {
                  launchCommand({
                    type: LaunchType.UserInitiated,
                    extensionName: packageJson.name,
                    name: "settings",
                  });
                }}
              />
            </ActionPanel>
          }
        />
      </Grid>
    );
  }

  return (
    <Detail
      markdown={data?.description ?? "Loading..."}
      isLoading={isLoading}
      actions={
        data?.command ? (
          <ActionPanel>
            <Action.CopyToClipboard content={data?.command ?? ""} />
          </ActionPanel>
        ) : null
      }
    />
  );
}
