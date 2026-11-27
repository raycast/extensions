import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { Named, Place, Settings, readSettings, tilde } from "./data";
import { openLink, openPlace } from "./forkz";

/** The last part of a path ("/" for the top). */
function lastPart(path: string): string {
  const parts = path.split("/").filter((part) => part !== "");
  return parts.length > 0 ? parts[parts.length - 1] : "/";
}

/** Folders to open in forkz (recent folders, favorites). */
export function PlaceList(props: { pick: (settings: Settings) => Place[]; empty: string; noun: string }) {
  const { data, isLoading, error } = usePromise(readSettings);
  const places = data ? props.pick(data) : [];
  return (
    <List isLoading={isLoading} searchBarPlaceholder={`Search ${props.noun}`}>
      {error ? (
        <List.EmptyView icon={Icon.Warning} title="forkz's settings could not be read" description={error.message} />
      ) : (
        <List.EmptyView icon={Icon.Folder} title={props.empty} />
      )}
      {places.map((place, index) => (
        <List.Item
          key={`${place.site?.id ?? "mac"}:${place.path}:${index}`}
          icon={place.site ? Icon.Globe : Icon.Folder}
          title={lastPart(place.path)}
          subtitle={place.site ? place.path : tilde(place.path)}
          accessories={place.site ? [{ tag: place.site.name }] : []}
          keywords={[place.path, place.site?.name ?? ""]}
          actions={
            <ActionPanel>
              <Action title="Open in Forkz" icon={Icon.ArrowRight} onAction={() => openPlace(place)} />
              {!place.site && <Action.ShowInFinder path={place.path} />}
              <Action.CopyToClipboard title="Copy Path" content={place.path} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

/** Saved items run by name (synclets, smart folders, workspaces). */
export function NamedList(props: {
  pick: (settings: Settings) => Named[];
  link: string;
  verb: string;
  icon: Icon;
  empty: string;
  hint: string;
  noun: string;
}) {
  const { data, isLoading, error } = usePromise(readSettings);
  const items = data ? props.pick(data) : [];
  return (
    <List isLoading={isLoading} searchBarPlaceholder={`Search ${props.noun}`}>
      {error ? (
        <List.EmptyView icon={Icon.Warning} title="forkz's settings could not be read" description={error.message} />
      ) : (
        <List.EmptyView icon={props.icon} title={props.empty} description={props.hint} />
      )}
      {items.map((item) => (
        <List.Item
          key={item.name}
          icon={props.icon}
          title={item.name}
          subtitle={item.detail}
          actions={
            <ActionPanel>
              <Action
                title={props.verb}
                icon={Icon.ArrowRight}
                onAction={() => openLink(props.link, { name: item.name })}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
