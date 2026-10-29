import { List, Icon, Action, ActionPanel, environment, AI, open } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useState } from "react";
import { useVersions } from "./hooks/useVersions";
import { useCommands } from "./hooks/useCommands";
import { DetailsView } from "./components/DetailsView";
import { VersionSelect } from "./components/VersionSelect";

// Raycast can't deeplink an extension's own Ask command, so Quick AI gets the mention as text
const askAiUrl = (prompt: string) =>
  `${process.env.RAYCAST_SCHEME ?? "raycast"}://extensions/raycast/ai/quick-ai?fallbackText=${encodeURIComponent(
    `@laravel-artisan{id=node_package_e:n:KevinBatdorf/laravel-artisan} ${prompt}`,
  )}`;

export default function Artisan() {
  const [version, setVersion] = useState<string | undefined>(undefined);
  const [search, setSearch] = useState<string | undefined>(undefined);
  const { versions, error: versionsError } = useVersions();
  const { commands, isLoading: loadingCommands, error: commandsError } = useCommands({ version, search });
  const error = versionsError ?? commandsError;
  // The version arrives from the dropdown a render after mount
  const isLoading = !error && (!version || loadingCommands);

  return (
    <List
      isLoading={isLoading}
      isShowingDetail
      onSearchTextChange={setSearch}
      throttle={true}
      searchBarPlaceholder="Search for a command..."
      searchBarAccessory={<VersionSelect versions={versions} setVersion={setVersion} />}
    >
      {/* Without an empty view, Raycast shows its own "No Results" while the list waits for rows */}
      <List.EmptyView
        icon={error ? Icon.Warning : Icon.MagnifyingGlass}
        title={error ? "Couldn't Load Commands" : isLoading ? "Loading Commands…" : "No Commands Found"}
        description={error?.message}
      />
      {commands?.map((command) => (
        <List.Item
          title={command.name}
          key={command.name + (search ?? "")}
          icon={{ source: Icon.Paragraph, tintColor: "#869aa8" }}
          detail={<DetailsView command={command} />}
          actions={
            <ActionPanel>
              {environment.canAccess(AI) ? (
                <Action
                  title="Ask AI"
                  icon={Icon.SpeechBubble}
                  onAction={() =>
                    open(askAiUrl(`Tell me about php artisan ${command.name} in Laravel ${version}`)).catch((error) =>
                      showFailureToast(error, { title: "Couldn't open Quick AI" }),
                    )
                  }
                />
              ) : null}
              {/* TODO: Not sure if we can append a space after the command */}
              <Action.CopyToClipboard title="Copy to Clipboard" content={command.name} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
