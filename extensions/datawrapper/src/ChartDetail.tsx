import { Detail, ActionPanel } from "@raycast/api";
import { Chart } from "./types";
import { date } from "./utils";
import ChartActions from "./ChartActions";

// chart names
import chartNameData from "../data/chartNames.json";
type ChartNames = {
  [key: string]: string;
};
const chartNames: ChartNames = chartNameData;

export default function ChartDetail({ data }: { data: Chart }) {
  // render title and image as markdown
  const markdown = `
  ${data.title && `### ${data.title}`}

  ![](https:${data.thumbnails.full}?raycast-height=300)
  `;

  return (
    <Detail
      markdown={markdown}
      navigationTitle={data.title}
      metadata={
        <Detail.Metadata>
          {/* link with chart id */}
          <Detail.Metadata.Link
            title="Visualization ID"
            target={`https://app.datawrapper.de/chart/${data.id}/edit`}
            text={data.id}
          />
          <Detail.Metadata.Separator />
          {/* if there's an author email, show it */}
          {/* {data.authorId && <Detail.Metadata.Label title="Author" text={data.authorId.toString()} />} */}

          {/* chart type and created date */}
          <Detail.Metadata.Label title="Type" text={chartNames[data.type] ?? "Not available"} />
          <Detail.Metadata.Label title="Created" text={date(data.createdAt)} />

          {/* if unpublished, show n/a */}
          <Detail.Metadata.Label title="Published" text={data.publishedAt ? date(data.publishedAt) : "n/a"} />

          {/* last edited date */}
          <Detail.Metadata.Label title="Last Edit" text={date(data.lastModifiedAt)} />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <ChartActions data={data} />
        </ActionPanel>
      }
    />
  );
}
