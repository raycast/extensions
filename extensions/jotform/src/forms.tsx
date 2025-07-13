import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useJotform } from "./jotform";
import { FormSubmission, Form as jfForm } from "./types";

export default function ListForms() {
  const { isLoading, data: forms } = useJotform<jfForm[]>("user/forms");

  return (
    <List isLoading={isLoading}>
      {!isLoading && !forms?.length && (
        <List.EmptyView
          icon="jfFormView-empty-icon.svg"
          title="You don't have any forms yet"
          description="Your forms will appear here."
          actions={
            <ActionPanel>
              <Action.OpenInBrowser title="Create Form" url="https://www.jotform.com/myforms/" />
            </ActionPanel>
          }
        />
      )}
      {forms?.map((form) => (
        <List.Item
          key={form.id}
          icon="formIcon.svg"
          title={form.title}
          subtitle={`${form.count} Submissions`}
          accessories={[
            { icon: form.favorite === "1" ? Icon.Star : Icon.StarDisabled },
            { date: new Date(form.created_at), tooltip: `Created on ${new Date(form.created_at).toDateString()}` },
          ]}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser url={form.url} />
              <Action.Push icon="IconProductInboxColorBorder.svg" title="Inbox" target={<FormInbox form={form} />} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function FormInbox({ form }: { form: jfForm }) {
  const { isLoading, data: submissions } = useJotform<FormSubmission[]>(`form/${form.id}/submissions`);
  const isEmpty = !isLoading && !submissions?.length;
  return (
    <List isLoading={isLoading} isShowingDetail={!isEmpty}>
      {isEmpty && (
        <List.EmptyView
          icon="jfSubmissionView-empty-icon.svg"
          title="You don't have any submissions"
          description="Your submissions will be listed here."
        />
      )}
      {submissions?.map((submission) => (
        <List.Item
          key={submission.id}
          icon="IconProductInboxColorBorder.svg"
          title={submission.id}
          detail={
            <List.Item.Detail
              markdown={`
| question | answer |
|---|---|
${Object.values(submission.answers)
  .filter((item) => item.answer)
  .map((item) => `| ${item.text} | ${"prettyFormat" in item ? item.prettyFormat : JSON.stringify(item.answer)} |`)
  .join(`\n`)}
`}
            />
          }
        />
      ))}
    </List>
  );
}
