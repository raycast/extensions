import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { API_HEADERS, API_URL, useTallyPaginated } from "./tally";
import { Form, SubmissionResult } from "./interfaces";
import OpenInTally from "./open-in-tally";
import { useFetch } from "@raycast/utils";

export default function Forms() {
  const { isLoading, data: forms } = useTallyPaginated<Form>("forms");
  return (
    <List isLoading={isLoading}>
      {forms.map((form) => (
        <List.Item
          key={form.id}
          icon={Icon.List}
          title={form.name}
          accessories={[{ tag: form.status }, { date: new Date(form.updatedAt), tooltip: `Edited ${form.updatedAt}` }]}
          actions={
            <ActionPanel>
              <Action.Push icon={Icon.Text} title="Submissions" target={<Submissions form={form} />} />
              <OpenInTally route={`forms/${form.id}`} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function Submissions({ form }: { form: Form }) {
  const { isLoading, data } = useFetch(API_URL + `forms/${form.id}/submissions`, {
    headers: API_HEADERS,
    mapResult(result: SubmissionResult) {
      return {
        data: {
          questions: result.questions,
          submissions: result.submissions,
        },
        hasMore: result.hasMore,
      };
    },
    initialData: {
      questions: [],
      submissions: [],
    },
  });

  return (
    <List isLoading={isLoading} isShowingDetail>
      {data.submissions.map((d) => (
        <List.Item
          key={d.id}
          title={d.id}
          detail={
            <List.Item.Detail
              markdown={`
| question | answer |
|----------|--------|
${Object.values(d.responses)
  .map(
    (response) =>
      `| ${data.questions.find((question) => question.id === response.questionId)?.title} | ${JSON.stringify(response.answer)} |`,
  )
  .join(`\n`)}`}
            />
          }
          actions={
            <ActionPanel>
              <OpenInTally route={`forms/${form.id}/submissions`} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
