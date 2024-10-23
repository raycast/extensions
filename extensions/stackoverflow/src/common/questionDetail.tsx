import { ActionPanel, Detail, useNavigation, Action, showToast, Toast, Icon } from "@raycast/api";
import { assertStringProp, assertArrayProp, assertNumberProp, assertObjectProp } from "./typeUtils";
import { useFetch } from "@raycast/utils";

type Metadata = {
  tags: string[];
  owner: string;
  owner_link: string;
  answer_count: number;
  view_count: number;
  score: number;
  link: string;
  last_activity_date: number;
};

export function QuestionDetail(props: { quid: string; url: string; title: string; site: string }) {
  const { markdown, metadata, error, isLoading } = getDetails(props.quid, props.site);
  const { pop } = useNavigation();
  if (error) {
    showToast(Toast.Style.Failure, "Cannot retrieve question details!", error);
  }
  return (
    <Detail
      isLoading={isLoading}
      navigationTitle={props.title}
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser url={props.url} />
          <Action title="Pop" onAction={pop} icon={Icon.ArrowLeftCircleFilled} />
        </ActionPanel>
      }
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Link title="Owner" target={metadata.owner_link} text={metadata.owner} />
          <Detail.Metadata.Label
            title="View Count / Answer Count"
            text={`${metadata.view_count} / ${metadata.answer_count}`}
          />
          <Detail.Metadata.Label
            title="Last Activity On"
            text={`${new Date(metadata.last_activity_date * 1000).toLocaleDateString("en-US", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}`}
          />
          <Detail.Metadata.TagList title="Tags">
            {metadata.tags.map((md, idx) => (
              <Detail.Metadata.TagList.Item text={md} key={`${idx}`} color={"#eed535"} />
            ))}
          </Detail.Metadata.TagList>
          <Detail.Metadata.Separator />
          <Detail.Metadata.Link title="Read Answers" target={metadata.link} text={metadata.link} />
          <Detail.Metadata.Label title="Answer Score" text={`${metadata.score}`} />
        </Detail.Metadata>
      }
    />
  );
}

export function getDetails(
  query: string,
  site: string,
): {
  markdown: string;
  metadata: Metadata;
  error?: string;
  isLoading: boolean;
} {
  const initialMarkdown = "## Question is Loading...";
  const initialMetadata: Metadata = {
    tags: [],
    answer_count: 0,
    view_count: 0,
    owner: "none",
    owner_link: "",
    score: 0,
    last_activity_date: 0,
    link: "",
  };

  const q = `https://api.stackexchange.com/2.3/questions/${query}?order=desc&sort=activity&site=${site}&filter=!nNPvSNP3wf`;
  const { isLoading, data, error } = useFetch(q, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      "Accept-Encoding": "gzip, deflate, br",
    },
    async parseResponse(response) {
      if (response.status !== 200) {
        const result = (await response.json()) as { message?: unknown } | undefined;
        throw new Error(`${result?.message || "Not OK"}`);
      }
      const result = await response.json();
      return result;
    },
    mapResult(result) {
      assertArrayProp(result, "items");
      const x_data = result.items[0];
      assertStringProp(x_data, "body_markdown");
      assertStringProp(x_data, "title");
      assertArrayProp(x_data, "tags");
      assertStringProp(x_data, "link");
      assertNumberProp(x_data, "answer_count");
      assertNumberProp(x_data, "view_count");
      assertNumberProp(x_data, "score");
      assertNumberProp(x_data, "last_activity_date");
      assertObjectProp(x_data, "owner");
      assertStringProp(x_data.owner, "display_name");
      assertStringProp(x_data.owner, "link");
      const md: Metadata = {
        tags: x_data.tags as string[],
        answer_count: x_data.answer_count,
        view_count: x_data.view_count,
        owner: x_data.owner.display_name,
        owner_link: x_data.owner.link,
        score: x_data.score,
        last_activity_date: x_data.last_activity_date,
        link: x_data.link,
      };
      const mdata = `
## ${x_data.title}

---

${x_data.body_markdown}

`;
      return {
        data: {
          markdown: mdata,
          metadata: md,
        },
      };
    },
    initialData: {
      markdown: initialMarkdown,
      metadata: initialMetadata,
    },
  });

  return { markdown: data.markdown, metadata: data.metadata, error: error?.message, isLoading };
}
