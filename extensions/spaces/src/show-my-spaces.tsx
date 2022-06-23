import { ActionPanel, Action, List } from "@raycast/api";
import { spawnSync } from "child_process";
import { v4 as uuidv4 } from "uuid";

class Space {
  constructor(public id?: string, public name?: string, public url?: string) {
    this.id = uuidv4();
    this.name = name ?? "";
    this.url = url ?? "spaces://";
  }
}

function retrieveSpaces() {
  const out = spawnSync("defaults read com.pradeepb28.spacesforraycast listOfSpaces", { shell: true });
  const result = String(out.output[1]).trim();

  const spacesItems = result.split(",");

  const spaces: Space[] = [];

  for (const spaceItem of spacesItems) {
    const space = new Space();

    if (spaceItem.startsWith("(\n")) {
      const filteredSpaceItem = spaceItem.replace("(\n", "").trim().replaceAll('"', "");

      space.name = filteredSpaceItem;
      space.url = "spaces://" + filteredSpaceItem.replace(/ /g, "").toLowerCase();
    } else if (spaceItem.endsWith("\n)")) {
      const filteredSpaceItem = spaceItem.replace("\n)", "").replace("\n", "").trim().replaceAll('"', "");

      space.name = filteredSpaceItem;
      space.url = "spaces://" + filteredSpaceItem.replace(/ /g, "").toLowerCase();
    } else {
      const filteredSpaceItem = spaceItem.replace("\n", "").trim().replaceAll('"', "");

      space.name = filteredSpaceItem;
      space.url = "spaces://" + filteredSpaceItem.replace(/ /g, "").toLowerCase();
    }

    spaces.push(space);
  }

  return spaces;
}

export default function Command() {
  const spaces = retrieveSpaces();

  if (spaces.length > 0) {
    return (
      <List isLoading={false} searchBarPlaceholder="Search by space name...">
        {spaces.map((space) => (
          <List.Item
            key={space.id}
            title={space.name!}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser url={space.url!} />
              </ActionPanel>
            }
          />
        ))}
      </List>
    );
  } else {
    return (
      <List isLoading={false}>
        <List.Item
          key="1"
          title="No spaces available. Double click or tap enter here to learn more about the app."
          actions={
            <ActionPanel>
              <Action.OpenInBrowser url="https://spacesformac.xyz" />
            </ActionPanel>
          }
        />
      </List>
    );
  }
}
