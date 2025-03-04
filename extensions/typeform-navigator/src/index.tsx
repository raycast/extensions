import { Action, ActionPanel, Icon, List, Detail } from "@raycast/api";
import { FormOverview, Workspace } from "./dto";
import { adminUrl } from "./utils";
import isAfter from "date-fns/isAfter";
import { useGetForm, useGetFormInsights, useGetFormResponses, useGetForms, useGetWorkspaces } from "./hooks";
import { format } from "date-fns";

const ADMIN_FORM_BASE_URL = "https://admin.typeform.com/form/";
const IN3_DATE = Date.UTC(2021, 6, 22);

export default function Command() {
  const { isLoading, data: workspaces } = useGetWorkspaces();

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Type to filter">
      {workspaces.map((workspace, idx) => {
        const sharedAccessory = workspace.shared
          ? { icon: Icon.Globe, text: "Shared" }
          : { icon: Icon.Person, text: "Private" };
        return (
          <List.Item
            key={idx}
            icon={Icon.AppWindowGrid2x2}
            title={workspace.name}
            accessories={[sharedAccessory]}
            actions={
              <ActionPanel>
                <Action.Push
                  title={`List Forms (${workspace.forms?.count ?? 0})`}
                  icon={Icon.List}
                  target={<Forms workspace={workspace} />}
                />
                <OpenWorkspaceInAdminAction link={workspace.self.href} />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}

function Forms({ workspace }: { workspace: Workspace }) {
  const { isLoading, data: forms } = useGetForms(workspace.id);

  return (
    <List isLoading={isLoading} navigationTitle={`Forms of ${workspace.name}`} searchBarPlaceholder="Type to filter">
      {forms.map((form, idx) => {
        const isInsights3 = isAfter(new Date(form.created_at), IN3_DATE);
        return (
          <List.Item
            key={idx}
            icon={Icon.SquareEllipsis}
            title={form.title}
            accessories={[
              form.settings.is_public
                ? { icon: Icon.Eye, tooltip: "Public" }
                : { icon: Icon.EyeDisabled, tooltip: "Private" },
              {
                date: new Date(form.last_updated_at),
                tooltip: `Updated: ${new Date(form.last_updated_at).toLocaleDateString()}`,
              },
            ]}
            actions={
              <ActionPanel>
                {isInsights3 && (
                  <Action.Push title="Show Details" icon={Icon.Sidebar} target={<FormInsights form={form} />} />
                )}
                <Action.Push icon={Icon.Coin} title="Show Responses" target={<FormResponses form={form} />} />
                <FormActions form={form} />
              </ActionPanel>
            }
          />
        );
      })}
      {forms && forms.length === 0 && (
        <List.EmptyView
          icon={{
            source: "empty-workspace-placeholder.png",
          }}
          title="Empty Workspace"
          description="Add a typeform to get started"
          actions={
            <ActionPanel>
              <OpenWorkspaceInAdminAction link={workspace.self.href} />
            </ActionPanel>
          }
        />
      )}
    </List>
  );
}

function FormInsights({ form }: { form: FormOverview }) {
  const { isLoading: isLoadingInsights, data: insights } = useGetFormInsights(form.id);
  const { isLoading: isLoadingForm, data: formDefinition } = useGetForm(form.id);

  const isLoading = isLoadingInsights || isLoadingForm;

  if (insights === null || formDefinition === null) {
    return <Detail navigationTitle={form.title} markdown={``} />;
  }

  return (
    <Detail
      navigationTitle={form.title}
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <FormActions form={form} />
        </ActionPanel>
      }
      metadata={
        insights &&
        formDefinition && (
          <Detail.Metadata>
            <Detail.Metadata.Label title="Views" text={`${insights.Metrics.totals.segmented_views.open}`} />
            <Detail.Metadata.Label title="Starts" text={`${insights.Metrics.totals.submission_starts}`} />
            <Detail.Metadata.Label title="Submissions" text={`${insights.Metrics.totals.submissions}`} />
            <Detail.Metadata.Label title="Completion Rate" text={`${insights.Metrics.totals.completion_rate}%`} />
            <Detail.Metadata.Separator />
            <Detail.Metadata.TagList title="Other data">
              <Detail.Metadata.TagList.Item text={`lang: ${formDefinition.settings.language}`} color="#0487af" />
              <Detail.Metadata.TagList.Item
                text={`public: ${form.settings.is_public ? "true" : "false"}`}
                color={form.settings.is_public ? "#0de60d" : "#e61f0d"}
              />
            </Detail.Metadata.TagList>
            <Detail.Metadata.Separator />
            <Detail.Metadata.Link title="Open" target={form._links.display} text="Fill it" />
            <Detail.Metadata.Link title="Edit" target={`${ADMIN_FORM_BASE_URL}${form.id}/create`} text="Open admin" />
            <Detail.Metadata.Link
              title="Results"
              target={`${ADMIN_FORM_BASE_URL}${form.id}/results`}
              text="Open admin"
            />
          </Detail.Metadata>
        )
      }
      markdown={`
# ${form.title}

- Check submissions and form stats on the right panel
- Press \`enter\` to see results
- Press \`cmd+enter\` to fill it
- Press \`cmd+e\` to edit it
- Grab the link into clipboard using \`cmd+.\`
- Copy form id (${form.id}) into clipboard using \`cmd+i\`
      `}
    />
  );
}

function FormActions({ form }: { form: FormOverview }) {
  return (
    <>
      <Action.OpenInBrowser title="Check Results" url={`${ADMIN_FORM_BASE_URL}${form.id}/results`} />
      <Action.OpenInBrowser title="Fill Form" url={form._links.display} />
      <Action.CopyToClipboard
        title="Copy Link"
        content={form._links.display}
        shortcut={{
          modifiers: ["cmd"],
          key: ".",
        }}
      />
      <Action.CopyToClipboard
        // eslint-disable-next-line @raycast/prefer-title-case
        title="Copy Form ID"
        content={form.id}
        shortcut={{
          modifiers: ["cmd"],
          key: "i",
        }}
      />
      <Action.OpenInBrowser
        title="Edit"
        url={`${ADMIN_FORM_BASE_URL}${form.id}/create`}
        shortcut={{
          modifiers: ["cmd"],
          key: "e",
        }}
      />
    </>
  );
}

function OpenWorkspaceInAdminAction({ link }: { link: string }) {
  return <OpenInTypeform url={adminUrl(link)} />;
}

function FormResponses({ form }: { form: FormOverview }) {
  const { isLoading, data: responses } = useGetFormResponses(form.id);
  return (
    <List isLoading={isLoading} isShowingDetail>
      {responses.map((response) => (
        <List.Item
          key={response.response_id}
          icon={response.response_type === "completed" ? Icon.Check : Icon.Ellipsis}
          title={format(new Date(response.submitted_at), "d MMM yyyy")}
          subtitle={format(new Date(response.submitted_at), "hh:mm")}
          detail={
            <List.Item.Detail
              markdown={response.answers
                .map((answer) => {
                  const key = Object.keys(answer).find((k) => k !== "field" && k !== "type") as keyof typeof answer;
                  return `- ${JSON.stringify(answer[key])}`;
                })
                .join(`\n`)}
            />
          }
          actions={
            <ActionPanel>
              <OpenInTypeform
                title="View Responses in Typeform"
                url={`${ADMIN_FORM_BASE_URL}form/${form.id}/results#responses`}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function OpenInTypeform(props: { title?: string; url: string }) {
  return <Action.OpenInBrowser icon="tf.png" title={props.title || "Open in Typeform"} url={props.url} />;
}
