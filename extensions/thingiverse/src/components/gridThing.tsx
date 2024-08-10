import { Action, ActionPanel, Grid } from "@raycast/api";
import { ThingiverseSearchResponse } from "../types/thing";
import { GetThing } from "../get-thing";

export const GridThing = ({ thing }: { thing: ThingiverseSearchResponse["hits"] }) => {
  return (
    <Grid.Item
      content={thing.preview_image ?? "https://upload.wikimedia.org/wikipedia/commons/1/14/No_Image_Available.jpg"}
      title={thing.name}
      id={thing.id.toString()}
      actions={<ThingActionPanel thing={thing} />}
    />
  );
};

const ThingActionPanel = ({ thing }: { thing: ThingiverseSearchResponse["hits"] }) => {
  return (
    <ActionPanel>
      <Action.Push title={`View Details`} target={<GetThing thing_id={thing.id} />} />
    </ActionPanel>
  );
};
