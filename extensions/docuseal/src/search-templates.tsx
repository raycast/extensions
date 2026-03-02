import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { ds, OpenInDocuSeal } from "./docuseal";

export default function SearchTemplates() {
  const {isLoading, data: templates} = useCachedPromise(() => async (options) => {
    // we need to explicitly add "after" otherwise doesn't work
    const result = await ds.listTemplates({limit: 20, ...options.cursor && {after: options.cursor}})
    return {
      data: result.data,
      hasMore: !!result.pagination.next,
      cursor: result.pagination.next
    }
  }, [], {initialData:[]})

  return <List isLoading={isLoading}>
    {templates.map(template => <List.Item key={template.id} icon={Icon.Document} title={template.name} accessories={[
      {icon: Icon.Person, text: `${template.author.first_name} ${template.author.last_name}`},
      {icon: Icon.Calendar, date: new Date(template.created_at)}
    ]} actions={<ActionPanel>
      <Action.Push icon={Icon.List} title="Submissions" target={<Submissions templateId={template.id} />} />
      <OpenInDocuSeal path={`templates/${template.id}`} />
    </ActionPanel>} />)}
  </List>
}

function Submissions({templateId}: {templateId: number}) {
  const {isLoading, data: submissions} = useCachedPromise((template_id: number) => async(options) => {
    const result = await ds.listSubmissions({template_id, limit: 20, ...options.cursor && {after: options.cursor}});
    return {
      data: result.data,
      hasMore: !!result.pagination.next,
      cursor: result.pagination.next
    }
  }, [templateId], {initialData: []})

  return <List isLoading={isLoading}>
    {!isLoading && !submissions.length ? <List.EmptyView title="There are no Submissions" description="Send an invitation to fill and complete the form" /> : submissions.map(submission => <List.Item key={submission.id} icon={{value: {source: Icon.CircleFilled, tintColor: submission.status==="completed" ? Color.Green : undefined}, tooltip: submission.status}} title={submission.name || submission.submitters[0].email || ""} actions={<ActionPanel>
      <OpenInDocuSeal title="View" path={`submissions/${submission.id}`} />
    </ActionPanel>} />)}
  </List>
}