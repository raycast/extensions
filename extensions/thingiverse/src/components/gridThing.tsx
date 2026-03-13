import { Action, ActionPanel, Grid } from "@raycast/api";
import { Thing } from "../types/thing";
import { GetThing } from "../get-thing";

export const GridThing = ({ thing }: { thing: Thing }) => {
  return (
    <Grid.Item
      content={thing.preview_image ?? "https://upload.wikimedia.org/wikipedia/commons/1/14/No_Image_Available.jpg"}
      title={thing.name}
      id={thing.id.toString()}
      actions={<ThingActionPanel thing={thing} />}
    />
  );
};

const ThingActionPanel = ({ thing }: { thing: Thing }) => {
  return (
    <ActionPanel>
      <Action.Push title={`View Details`} target={<GetThing thing_id={thing.id} />} />
    </ActionPanel>
  );
};
