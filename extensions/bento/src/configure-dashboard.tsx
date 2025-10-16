import React, { useState, useEffect } from "react";
import { Action, ActionPanel, Form, useNavigation, showToast, Toast, LocalStorage } from "@raycast/api";

export default function ConfigureDashboard() {
  const [reportIds, setReportIds] = useState<string[]>(Array(4).fill(""));
  const { pop } = useNavigation();

  useEffect(() => {
    LocalStorage.getItem<string>("dashboardReportIds").then((storedIds) => {
      if (storedIds) {
        const parsedIds = JSON.parse(storedIds);
        setReportIds(parsedIds.length === 4 ? parsedIds : Array(4).fill(""));
      }
    });
  }, []);

  const handleSubmit = async (values: { [key: string]: string }) => {
    const newReportIds = [values.reportId1, values.reportId2, values.reportId3, values.reportId4];
    await LocalStorage.setItem("dashboardReportIds", JSON.stringify(newReportIds));
    await showToast({
      style: Toast.Style.Success,
      title: "Dashboard Configured",
      message: "Report IDs have been saved",
    });
    pop();
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Configuration" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      {[1, 2, 3, 4].map((num) => (
        <Form.TextField
          key={num}
          id={`reportId${num}`}
          title={`Report ID ${num}`}
          placeholder="Enter report ID"
          value={reportIds[num - 1]}
          onChange={(newValue) => {
            const newReportIds = [...reportIds];
            newReportIds[num - 1] = newValue;
            setReportIds(newReportIds);
          }}
        />
      ))}
    </Form>
  );
}
