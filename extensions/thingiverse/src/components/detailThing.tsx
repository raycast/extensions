import { Detail, Icon, ActionPanel, Action } from "@raycast/api";
import { Thing } from "../types/thing";

export const DetailThing = ({ thing }: { thing: Thing }) => {
  // Find top 3 tags sorted by count
  thing.tags = thing.tags.sort((a, b) => b.count - a.count).slice(0, 3);

  const markdown = `
# ${thing.name}
  
  ${thing.zip_data.images && thing.zip_data.images.map((image) => `![${image.name}](${image.url})`)}

${
  thing.description &&
  `## Description
    ${thing.description}`
}
`;

  return (
    <Detail
      markdown={markdown}
      navigationTitle={thing.name}
      actions={<ThingActions thing={thing} />}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label
            title="Released"
            text={new Date(thing.added).toISOString().split("T")[0]}
            icon={Icon.Calendar}
          />
          <Detail.Metadata.Label title="Creator" text={thing.creator.name} icon={Icon.Person} />
          <Detail.Metadata.Label title="Likes" text={thing.like_count.toLocaleString()} icon={Icon.ThumbsUp} />
          <Detail.Metadata.Label title="Downloads" text={thing.download_count.toLocaleString()} icon={Icon.Download} />
          <Detail.Metadata.Label title="Makes" text={thing.make_count.toLocaleString()} icon={Icon.Print} />
          <Detail.Metadata.Label
            title="# of files"
            text={thing.zip_data.files.length.toString()}
            icon={Icon.SaveDocument}
          />
          <Detail.Metadata.TagList title={"Tags"}>
            {thing.tags.map((tag) => (
              <Detail.Metadata.TagList.Item key={tag.name} text={tag.name} color={"raycast-blue"} />
            ))}
          </Detail.Metadata.TagList>
          <Detail.Metadata.Link title="Thingiverse" target={thing.public_url} text="View in browser" />
        </Detail.Metadata>
      }
    />
  );
};

const ThingActions = ({ thing }: { thing: Thing }) => {
  return (
    <ActionPanel>
      <Action.OpenInBrowser title="View on Thingiverse" url={thing.public_url} />
    </ActionPanel>
  );
};

// const downloadFile = async (fileName: string, fileUrl: string) => {
//   const options = {
//     directory: "./images/",
//     filename: fileName
//   };
//
//   download(fileUrl, options, (err: Error | null) => {
//     if (err) {
//       throw err;
//     }
//     console.log("File downloaded successfully");
//   });
//
//   return await showToast({
//     title: `Fetching popular Things...`,
//     style: Toast.Style.Animated,
//   });
// };
