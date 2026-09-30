import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { API_URL, API_HEADERS } from "./config";
import { Form, PaginatedResult, Submission } from "./types";
import { getBlockTitle } from "./utils";

export default function Submissions({ form }: { form: Form }) {
  const {
    isLoading,
    data: { submissions, questions },
  } = useFetch(API_URL + `forms/${form.slug}/submissions`, {
    headers: API_HEADERS,
    mapResult(result: PaginatedResult<Submission>) {
      // answers are in reverse order
      const submissions = result.data.data.toReversed();
      // map the questions to the id
      const questions = !submissions.length
        ? []
        : Object.keys(submissions[0].data).map((id) =>
            getBlockTitle(form.fields?.blocks.find((block) => block.id === id)),
          );
      return {
        data: {
          questions,
          submissions,
        },
      };
    },
    initialData: {
      submissions: [],
      questions: [],
    },
  });
  return (
    <List navigationTitle={`Search Forms / ${form.slug} / Submissions`} isLoading={isLoading} isShowingDetail>
      {!isLoading && !submissions.length ? (
        <List.EmptyView
          title="No submissions yet."
          description="Please share your form to the world to start collecting submissions."
          actions={
            <ActionPanel>
              <Action.CopyToClipboard title="Copy Share URL" content={`https://app.youform.com/forms/${form.slug}`} />
              <Action.OpenInBrowser title="Open Form" url={`https://app.youform.com/forms/${form.slug}`} />
            </ActionPanel>
          }
        />
      ) : (
        submissions.map((submission) => (
          <List.Item
            key={submission.id}
            icon={Icon.Clock}
            title={new Date(submission.created_at).toLocaleDateString("en-US", {
              year: "numeric",
              month: "short",
              day: "2-digit",
              hour: "2-digit",
              minute: "2-digit",
              hour12: true,
            })}
            detail={
              <List.Item.Detail
                markdown={`| q | a |
|---|---|
${Object.values(submission.data)
  .map((answer, index) => `| ${questions[index]} | ${JSON.stringify(answer)} |`)
  .join(`\n`)}`}
              />
            }
          />
        ))
      )}
    </List>
  );
}
