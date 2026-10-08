import { ActionPanel, List, Action } from "@raycast/api";
import { SingleElement } from "./interfaces/element";
import rawData from "./data/elements.json";
import { renderDetails } from "./renderDetails";

export default function Command() {
  const elements = (rawData as { elements: SingleElement[] }).elements;

  return (
    <List isShowingDetail searchBarPlaceholder="Search element by Name">
      <List.Section title="Elements">
        {elements.map((element: SingleElement) => (
          <List.Item
            key={element.name}
            title={element.name}
            subtitle={element.electron_configuration_semantic}
            accessories={[{ text: element.symbol }]}
            detail={<List.Item.Detail markdown={renderDetails(element)} />}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser title="More Info" url={element.source} />
                <Action.CopyToClipboard
                  title="Copy Electron Configuration"
                  content={element.electron_configuration_semantic}
                  shortcut={{ modifiers: ["cmd"], key: "c" }}
                />
                <Action.CopyToClipboard
                  title="Copy Electron Affinity"
                  content={element.electron_affinity + ""}
                  shortcut={{ modifiers: ["cmd"], key: "a" }}
                />
                <Action.CopyToClipboard
                  title="Copy Atomic Mass"
                  content={element.atomic_mass}
                  shortcut={{ modifiers: ["cmd"], key: "m" }}
                />
                <Action.CopyToClipboard
                  title="Copy Atomic Density"
                  content={element.density + ""}
                  shortcut={{ modifiers: ["cmd"], key: "d" }}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
