import { Action, ActionPanel, Detail, Icon, List } from "@raycast/api";
import { API_HEADERS, API_URL, useTallyPaginated } from "./tally";
import { Form, SubmissionResult } from "./interfaces";
import OpenInTally from "./open-in-tally";
import { useFetch } from "@raycast/utils";

export default function Forms() {
    const { isLoading, data: forms } = useTallyPaginated<Form>("forms");
    return <List isLoading={isLoading}>
        {forms.map(form => <List.Item key={form.id} icon={Icon.List} title={form.name} accessories={[
            {tag: form.status},
            {date: new Date(form.updatedAt), tooltip: `Edited ${form.updatedAt}`}
        ]} actions={<ActionPanel>
            <Action.Push icon={Icon.Text} title="Submissions" target={<Submissions form={form} />} />
            <OpenInTally route={`forms/${form.id}`} />
        </ActionPanel>} />)}
    </List>
}

function Submissions({form}: {form: Form}) {
    const { isLoading, data } = useFetch(API_URL + `forms/${form.id}/submissions`, {
        headers: API_HEADERS,
        mapResult(result: SubmissionResult
        ) {
            // const data = result.submissions.map(submission => {
            //         const s = submission.responses.map(response => {
            //             const question = result.questions.find(q => q.id===response.questionId);
            //             return { question: question?.title, answer: response.value };
            //         })
            //         return {}
            //     }
            // )
            // const data = result.submissions.map(submission => )
            const data = result.submissions
            return {
                data,
                hasMore: result.hasMore
            }
        },
        initialData: []
    })

    return <List isLoading={isLoading} isShowingDetail>
        {data.map(d => <List.Item key={d.id} title={d.id} detail={<List.Item.Detail markdown={`
| question | answer |
|----------|--------|
${Object.values(d.responses).map(response => `| ${response.questionId} | ${JSON.stringify(response.answer)} |`).join(`\n`)}`} />} />)}
    </List>
}