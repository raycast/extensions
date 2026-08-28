import { Action, ActionPanel, Form, Icon, open, popToRoot, showToast, Toast } from "@raycast/api";
import { showFailureToast, useFetch, useForm } from "@raycast/utils";
import { useState } from "react";
import { BaseUrl, buildHeaders, CreateDataResponse, endpoints } from "./api/endpoints";
import { useAuth } from "./hooks/useAuth";

type FormValues = {
  projectId: string;
  title: string;
  content: string;
};

export default function CreateDataEntry() {
  const { token } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: projectsResult, isLoading: projectsLoading } = useFetch(
    BaseUrl + `${endpoints.projects.path}?sort=title:asc&page[limit]=100`,
    {
      headers: buildHeaders(token),
      parseResponse: async (response) => {
        const json = await response.json();
        return endpoints.projects.schema.parse(json);
      },
      onError: (error) => {
        showFailureToast(error, { title: "Failed to load projects" });
      },
    },
  );

  const { handleSubmit, itemProps } = useForm<FormValues>({
    async onSubmit(values) {
      setIsSubmitting(true);
      try {
        const response = await fetch(BaseUrl + "/v1/data", {
          method: "POST",
          headers: buildHeaders(token),
          body: JSON.stringify({
            project_id: values.projectId,
            title: values.title || undefined,
            content: values.content || undefined,
          }),
        });

        if (!response.ok) {
          const body = await response.text();
          throw new Error(`${response.status} ${response.statusText}: ${body}`);
        }

        const parsed = CreateDataResponse.parse(await response.json());
        const url = parsed.data.url ?? `https://dovetail.com/data/${parsed.data.id}`;

        await showToast({
          style: Toast.Style.Success,
          title: "Data entry created",
          message: parsed.data.title ?? undefined,
          primaryAction: { title: "Open in Dovetail", onAction: () => open(url) },
        });
        await popToRoot();
      } catch (error) {
        await showFailureToast(error, { title: "Failed to create data entry" });
      } finally {
        setIsSubmitting(false);
      }
    },
    validation: {
      projectId: (value) => (!value ? "Choose a project" : undefined),
    },
  });

  return (
    <Form
      isLoading={projectsLoading || isSubmitting}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Data Entry" icon={Icon.Plus} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Dropdown title="Project" {...itemProps.projectId}>
        {projectsResult?.data.map((project) => (
          <Form.Dropdown.Item key={project.id} value={project.id} title={project.title} icon={Icon.Folder} />
        ))}
      </Form.Dropdown>
      <Form.TextField title="Title" placeholder="e.g. Customer interview — Jane Doe" {...itemProps.title} />
      <Form.TextArea
        title="Content"
        placeholder="Paste notes, a transcript, or any plain text content..."
        {...itemProps.content}
      />
    </Form>
  );
}
