import { Action, ActionPanel, Detail, Form, getPreferenceValues, Icon, showToast, Toast } from "@raycast/api";
import { FormValidation, useFetch, useForm } from "@raycast/utils";
import { StatusReportSchema, StatusReportUpdate } from "./api/schema";
import fetch from "node-fetch";

export default function CreateStatusReportUpdate() {
  const preferences = getPreferenceValues<Preferences>();
  const { isLoading, data } = useFetch("https://api.openstatus.dev/v1/status_report", {
    headers: {
      "x-openstatus-key": `${preferences.access_token}`,
    },
    mapResult(result) {
      console.log(result);
      return {
        data: StatusReportSchema.array()
          .parse(result)
          .filter((report) => report.status !== "resolved"),
      };
    },
    keepPreviousData: true,
    initialData: [],
  });

  const { handleSubmit, itemProps } = useForm<StatusReportUpdate>({
    onSubmit: async (values) => {
      console.log(values);
      // Small hack to convert pageId to number
      values.statusReportId = Number(values.statusReportId);
      const rest = await fetch(`https://api.openstatus.dev/v1/status_report_update`, {
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
          message: "Failed to create status report update",
          style: Toast.Style.Failure,
        });
        return;
      }
      showToast({ title: "Created", message: "Status report update created" });
    },
    validation: {
      message: FormValidation.Required,
      statusReportId: FormValidation.Required,
    },
  });

  if (!isLoading && data.length === 0) {
    return <Detail markdown="No ongoing incident" />;
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.Plus} title="Create Report" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Dropdown id="status" title="Status" defaultValue="investigating">
        <Form.Dropdown.Item value="investigating" title="Investigating" />
        <Form.Dropdown.Item value="identified" title="Identified" />
        <Form.Dropdown.Item value="monitoring" title="Monitoring" />
        <Form.Dropdown.Item value="resolved" title="Resolved" />
      </Form.Dropdown>
      <Form.TextArea title="Message" placeholder="We are encountering..." {...itemProps.message} />
      <Form.DatePicker title="Start Date" {...itemProps.date} />
      <Form.Dropdown id="statusReportId" title="Status Report">
        {data.map((report) => (
          <Form.Dropdown.Item value={String(report.id)} title={report.title} key={report.id} />
        ))}
      </Form.Dropdown>
    </Form>
  );
}
