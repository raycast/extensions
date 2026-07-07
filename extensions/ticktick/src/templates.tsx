import { withAccessToken } from "@raycast/utils";
import { authorize } from "./api/oauth";
import { getPreferenceValues, List, Icon, ActionPanel, Action, showToast, Toast, Form, useNavigation } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { getTemplates, createTaskFromTemplate } from "./api/ticktick";
import { useSync } from "./hooks/useSync";
import { useAlerts } from "./hooks/useAlerts";
import { useFirstRun } from "./lib/useFirstRun";

function UseTemplateForm({
  templateId,
  templateTitle,
  onCreated,
}: {
  templateId: string;
  templateTitle: string;
  onCreated: () => void;
}) {
  const { pop } = useNavigation();
  const { data } = useSync();
  const projects = data.projects.filter((p) => !p.closed);

  return (
    <Form
      navigationTitle={`Use: ${templateTitle}`}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Create Task"
            onSubmit={async (values: { projectId: string }) => {
              try {
                await createTaskFromTemplate(templateId, values.projectId || data.inboxId);
                await showToast({ style: Toast.Style.Success, title: "Task created from template" });
                onCreated();
                pop();
              } catch (err) {
                await showToast({ style: Toast.Style.Failure, title: "Failed", message: String(err) });
              }
            }}
          />
        </ActionPanel>
      }
    >
      <Form.Dropdown id="projectId" title="Project" defaultValue={data.inboxId || projects[0]?.id}>
        {projects.map((p) => (
          <Form.Dropdown.Item key={p.id} value={p.id} title={p.name} />
        ))}
      </Form.Dropdown>
    </Form>
  );
}

function Templates() {
  useFirstRun();
  useAlerts();

  const {
    data: templates,
    isLoading,
    revalidate,
  } = useCachedPromise(getTemplates, [], {
    keepPreviousData: true,
    failureToastOptions: { title: "Failed to load templates" },
  });

  return (
    <List isLoading={isLoading} navigationTitle="Templates" searchBarPlaceholder="Search templates...">
      {(templates ?? []).length === 0 && !isLoading ? (
        <List.EmptyView icon={Icon.Document} title="No templates" description="Create templates in TickTick." />
      ) : (
        <List.Section title={`${templates?.length ?? 0} template${(templates?.length ?? 0) !== 1 ? "s" : ""}`}>
          {(templates ?? []).map((t) => (
            <List.Item
              key={t.id}
              icon={Icon.Document}
              title={t.title}
              subtitle={t.content}
              accessories={t.priority ? [{ text: `P${t.priority}` }] : []}
              actions={
                <ActionPanel>
                  <Action.Push
                    title="Create Task from Template"
                    icon={Icon.Plus}
                    target={<UseTemplateForm templateId={t.id} templateTitle={t.title} onCreated={revalidate} />}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}

const { integrationMode } = getPreferenceValues<{ integrationMode: string }>();
function APIRequired() {
  return (
    <List>
      <List.EmptyView
        icon={Icon.Lock}
        title="API Mode Required"
        description="Switch to API mode in TickTick extension preferences (Raycast Settings → Extensions → TickTick) to use this feature."
      />
    </List>
  );
}
export default integrationMode === "applescript" ? APIRequired : withAccessToken({ authorize })(Templates);
