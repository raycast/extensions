import { Action, ActionPanel, Form, getPreferenceValues, Icon, showToast, Toast } from "@raycast/api";
import { FormValidation, useFetch, useForm } from "@raycast/utils";
import { pageSchema, StatusReport } from "./api/schema";

export default function CreateStatusReport() {
  const preferences = getPreferenceValues<Preferences>();
  const { isLoading, data } = useFetch("https://api.openstatus.dev/v1/page", {
    headers: {
      "x-openstatus-key": `${preferences.access_token}`,
    },
    mapResult(result) {
      return { data: pageSchema.array().parse(result) };
    },
    keepPreviousData: true,
    initialData: [],
  });

  const { handleSubmit, itemProps } = useForm<StatusReport>({
    onSubmit: async (values) => {
      console.log(values);
      // Small hack to convert pageId to number
      values.pageId = Number(values.pageId);
      const rest = await fetch(`https://api.openstatus.dev/v1/status_report`, {
        headers: {
          "x-openstatus-key": `${preferences.access_token}`,
          "Content-Type": "application/json",
        },
        method: "POST",
        body: JSON.stringify(values),
      });
      if (rest.status !== 200) {
        showToast({
          title: "Error",
          message: "Failed to create status report",
          style: Toast.Style.Failure,
        });
        return;
      }
      showToast({ title: "Created", message: "Status report created" });
    },
    validation: {
      title: FormValidation.Required,
      message: FormValidation.Required,
      pageId: FormValidation.Required,
    },
  });
  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.Plus} title="Create Report" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField title="Title" placeholder="Downtime..." {...itemProps.title} />
      <Form.TextArea title="Message" placeholder="We are encountering..." {...itemProps.message} />
      <Form.DatePicker title="Start Date" {...itemProps.date} />
      <Form.Dropdown id="status" title="Status" defaultValue="investigating">
        <Form.Dropdown.Item value="investigating" title="Investigating" />
        <Form.Dropdown.Item value="identified" title="Identified" />
        <Form.Dropdown.Item value="monitoring" title="Monitoring" />
        <Form.Dropdown.Item value="resolved" title="Resolved" />
      </Form.Dropdown>
      <Form.Dropdown id="pageId" title="Page">
        {data.map((page) => (
          <Form.Dropdown.Item value={String(page.id)} title={page.title} key={page.id} />
        ))}
      </Form.Dropdown>
    </Form>
  );
}
