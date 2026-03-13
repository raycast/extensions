import { List } from "@raycast/api";
import { useFetch } from "@raycast/utils";

export default function Command() {
  // load raw markdown data as string
  const { isLoading, data }: { isLoading: boolean; data?: string } = useFetch(
    "https://raw.githubusercontent.com/datawrapper/datawrapper/main/libs/chart-core/docs/parser.md",
  );

  // remove everything between "# Reference" and "<a name="!"></a>"
  const renderedData = data?.replace(/# Reference[\s\S]*<a name="!"><\/a>/, "");

  // when the data contains "<a name=""></a>", split on it
  let sections = renderedData?.split(/<a name=".*"><\/a>/);

  // remove all <code> and <a name> blocks
  sections = sections?.map((section) => {
    section = section.replace(/<code>/g, "").replace(/<\/code>/g, "");
    section = section.replace(/<a name=".*"><\/a>/g, "");
    // replace all instances of "(#LOREM)" with "(#github.com/LOREM)" so the links work
    section = section.replace(
      /\(#([A-Z]+)\)/g,
      "(https://github.com/datawrapper/datawrapper/blob/main/libs/chart-core/docs/parser.md#$1)",
    );
    return section;
  });

  // create an array of objects with title and content
  const sectionObjects = sections?.map((section) => {
    const title = section.match(/## (.*)\n/)?.[1] || "";
    return {
      title,
      content: section,
    };
  });

  return (
    <List
      navigationTitle="List Parser Functions"
      searchBarPlaceholder="Search for a function"
      isShowingDetail={data ? true : false}
      isLoading={isLoading}
    >
      {data ? (
        sectionObjects?.map((d) => {
          return <List.Item title={d.title} key={d.title} detail={<List.Item.Detail markdown={d.content} />} />;
        })
      ) : (
        <List.EmptyView title="Unable to retrieve source file from GitHub" />
      )}
    </List>
  );
}
