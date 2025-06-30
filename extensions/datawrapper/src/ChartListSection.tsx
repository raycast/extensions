import { Grid, Action, Icon, ActionPanel, openExtensionPreferences } from "@raycast/api";
import { Chart, OrderOption } from "./types";
import ChartDetail from "./ChartDetail";
import ChartActions from "./ChartActions";
import { date } from "./utils";

export default function ChartListSection({
  data,
  title,
  selectedOrderData,
}: {
  data: Chart[];
  title: string;
  selectedOrderData: OrderOption;
}) {
  const o = selectedOrderData;
  return (
    <Grid.Section title={title} aspectRatio="4/3" fit={Grid.Fit.Fill}>
      {data.map((d: Chart) => (
        <Grid.Item
          key={d.id}
          content={{ source: `https:${d.thumbnails.plain}` /*mask: Image.Mask.RoundedRectangle*/ }}
          title={d.title === "" ? " " : d.title}
          subtitle={
            o.id === "publishedAt" && !d[o.id as keyof Chart]
              ? "Not published"
              : `${o.subtitleLabel} ${date(d[o.id as keyof Chart] as string)}`
          }
          actions={
            <ActionPanel>
              <ChartActions data={d}>
                <Action.Push title="Open Chart Details" target={<ChartDetail data={d} />} />
              </ChartActions>
              <Action
                title="Change Grid Column Count"
                onAction={openExtensionPreferences}
                icon={Icon.AppWindowGrid2x2}
              />
            </ActionPanel>
          }
        />
      ))}
    </Grid.Section>
  );
}
