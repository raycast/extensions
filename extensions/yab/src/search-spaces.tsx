import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { failed, focusSpace, getSpaces } from "./yab";

export default function Command() {
  const { data = [], isLoading } = useCachedPromise(getSpaces);
  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search spaces">
      {data.map((s) => (
        <List.Item
          key={s.id}
          title={s.title}
          icon={{ source: Icon.CircleFilled, tintColor: s.color ? `#${s.color}` : Color.SecondaryText }}
          accessories={s.active ? [{ tag: "Current" }] : []}
          actions={
            <ActionPanel>
              <Action
                title="Switch to Space"
                icon={Icon.ArrowRight}
                onAction={() => focusSpace(s.id).catch((e) => failed("Could not switch space", e))}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
