import { Action, ActionPanel, Icon, List, useNavigation } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { getActiveConnection } from "./lib/connections";
import { PRESETS, type Preset } from "./lib/presets";
import { ResultView } from "./views/result-view";
import { NoConnection } from "./views/no-connection";

export default function CommandPalette() {
  const { push } = useNavigation();
  const { data: connection, isLoading } = usePromise(getActiveConnection);

  if (!isLoading && !connection) {
    return <NoConnection />;
  }

  const categories = [...new Set(PRESETS.map((preset) => preset.category))];

  function run(preset: Preset) {
    if (!connection) return;
    push(<ResultView connection={connection} method={preset.method} path={preset.path} />);
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search commands…">
      {categories.map((category) => (
        <List.Section key={category} title={category}>
          {PRESETS.filter((preset) => preset.category === category).map((preset) => (
            <List.Item
              key={preset.key}
              icon={Icon.Terminal}
              title={preset.title}
              subtitle={`${preset.method} ${preset.path}`}
              keywords={[preset.method, preset.path]}
              accessories={[{ text: preset.description }]}
              actions={
                <ActionPanel>
                  <Action title="Run Command" icon={Icon.Bolt} onAction={() => run(preset)} />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ))}
    </List>
  );
}
