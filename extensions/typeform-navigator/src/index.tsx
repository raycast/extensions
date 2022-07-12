import { Action, ActionPanel, getPreferenceValues, Icon, List, Detail, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import { createJsonHttpClient } from "./infra/http-client";
import { FormDefinition, FormOverview, FormsResponse, InsightsResponse, Workspace, WorkspacesResponse } from "./dto";
import { adminUrl } from "./utils";
import got from "got";
import isAfter from "date-fns/isAfter";

const ADMIN_FORM_BASE_URL = "https://admin.typeform.com/form/";
const IN3_DATE = Date.UTC(2021, 6, 22);

interface Preferences {
  personalToken: string;
}

export default function Command() {
  const { personalToken } = getPreferenceValues<Preferences>();
  const jsonHttpClient = createJsonHttpClient(personalToken);

  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (workspaces.length > 0 || error) {
      return;
    }
    jsonHttpClient
      .get<WorkspacesResponse>("workspaces")
      .then((response) => {
        setWorkspaces(response.body.items);
      })
      .catch((e) => {
        console.error(e);
        const errorMessage = "Workspace load failed. Try later.";
        setError(errorMessage);
        return showErrorToast(errorMessage);
      });
  }, [workspaces]);

  const isLoading = workspaces.length === 0 && error === null;

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Type to filter">
      {workspaces.map((workspace, idx) => {
        const sharedAccessory = workspace.shared
          ? { icon: Icon.Globe, text: "Shared" }
          : { icon: Icon.Person, text: "Private" };
        return (
          <List.Item
            key={idx}
            title={workspace.name}
            accessories={[sharedAccessory]}
            actions={
              <ActionPanel>
                <Action.Push
                  title={`List Forms (${workspace.forms?.count ?? 0})`}
                  icon={Icon.List}
                  target={<Forms workspace={workspace} clientHttp={jsonHttpClient} />}
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

function Forms({ workspace, clientHttp }: { workspace: Workspace; clientHttp: typeof got }) {
  const [forms, setForms] = useState<FormOverview[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (forms !== null || error) {
      return;
    }
    clientHttp
      .get<FormsResponse>("forms", {
        searchParams: {
          workspace_id: workspace.id,
        },
      })
      .then((response) => {
        setForms(response.body.items);
      })
      .catch((e) => {
        console.error(e);
        const errorMessage = "Forms load failed. Try later.";
        setError(errorMessage);
        return showErrorToast(errorMessage);
      });
  }, [forms, error]);

  const isLoading = forms === null && error === null;
  return (
    <List isLoading={isLoading} navigationTitle={`Forms of ${workspace.name}`} searchBarPlaceholder="Type to filter">
      {forms &&
        forms.length > 0 &&
        forms.map((form, idx) => {
          const isInsights3 = isAfter(new Date(form.created_at), IN3_DATE);
          return (
            <List.Item
              key={idx}
              title={form.title}
              accessories={[{ icon: form.settings.is_public ? Icon.Eye : Icon.EyeSlash }]}
              actions={
                <ActionPanel>
                  {isInsights3 && (
                    <Action.Push
                      title="Show Details"
                      icon={Icon.Sidebar}
                      target={<FormInsights form={form} clientHttp={clientHttp} />}
                    />
                  )}
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

function FormInsights({ form, clientHttp }: { form: FormOverview; clientHttp: typeof got }) {
  const [insights, setInsights] = useState<InsightsResponse | null>(null);
  const [formDefinition, setFormDefinition] = useState<FormDefinition | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (insights || formDefinition || error) {
      return;
    }
    Promise.all([
      clientHttp.get<InsightsResponse>(`forms/${form.id}/insights/metrics`),
      clientHttp.get<FormDefinition>(`forms/${form.id}`),
    ])

      .then(([insightsResponse, formDefinitionResponse]) => {
        setInsights(insightsResponse.body);
        setFormDefinition(formDefinitionResponse.body);
      })
      .catch((e) => {
        console.error(e);
        const errorMessage = "Fetch data failed. Try later.";
        setError(errorMessage);
        return showErrorToast(errorMessage);
      });
  }, [insights, formDefinition, error]);

  const isLoading = insights === null && formDefinition === null && error === null;

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
          <Detail.Metadata.Link title="Results" target={`${ADMIN_FORM_BASE_URL}${form.id}/results`} text="Open admin" />
        </Detail.Metadata>
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
  return <Action.OpenInBrowser title="Open in Typeform" url={adminUrl(link)} />;
}

async function showErrorToast(errorMessage: string) {
  const options: Toast.Options = {
    style: Toast.Style.Failure,
    title: errorMessage,
  };
  await showToast(options);
}
