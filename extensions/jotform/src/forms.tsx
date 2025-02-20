import { Action, ActionPanel, List } from "@raycast/api";
import { useJotform } from "./jotform";
import { FormSubmission, Form as jfForm } from "./types";

export default function ListForms() {
    const { isLoading, data: forms } = useJotform<jfForm[]>("user/forms");

    return <List isLoading={isLoading}>
        {!isLoading && !forms?.length && <List.EmptyView icon="jfFormView-empty-icon.svg" title="YOU DON'T HAVE ANY FORMS YET" description="Your forms will appear here." actions={<ActionPanel>
            <Action.OpenInBrowser title="Create Form" url="https://www.jotform.com/myforms/" />
        </ActionPanel>} />}
        {forms?.map(form => <List.Item key={form.id} icon="formIcon.svg" title={form.title} subtitle={`${form.count} Submissions`} accessories={[
            { date: new Date(form.created_at), tooltip: `Created on ${new Date(form.created_at).toDateString()}` }
        ]} actions={<ActionPanel>
            <Action.Push icon="IconProductInboxColorBorder.svg" title="Inbox" target={<FormInbox form={form} />} />
        </ActionPanel>} />)}
    </List>
}

function FormInbox({form}: {form: jfForm}) {
    const { isLoading, data: submissions } = useJotform<FormSubmission[]>(`form/${form.id}/submissions`)
    const isEmpty = !isLoading && !submissions?.length;
    return <List isLoading={isLoading} isShowingDetail={!isEmpty}>
        {isEmpty && <List.EmptyView icon="jfSubmissionView-empty-icon.svg" title="YOU DON'T HAVE ANY SUBMISSIONS" description="Your submissions will be listed here." />}
{submissions?.map(submission => <List.Item key={submission.id} title={submission.id} detail={<List.Item.Detail markdown={`
| q | a |
|---|---|
${Object.entries(submission.answers).map(([q, a]) => `| ${q} | ${JSON.stringify(a)} |`).join(`\n`)}
`} />} />)}
    </List>
}