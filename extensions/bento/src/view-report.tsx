import React, { useState } from "react";
import { Action, ActionPanel, Form, useNavigation, showToast, Toast } from "@raycast/api";
import { getReport, ReportData } from "./api-client";
import ReportChart from "./ReportChart";

export default function ViewReport() {
    const [reportId, setReportId] = useState("");
    const { push } = useNavigation();

    const handleSubmit = async (values: { reportId: string }) => {
        try {
            console.log("ViewReport: Fetching report with ID:", values.reportId);
            const report = await getReport(values.reportId);
            console.log("ViewReport: Received report data:", JSON.stringify(report, null, 2));
            push(<ReportChart report={report} />);
        } catch (error) {
            console.error("Failed to fetch report:", error);
            await showToast({
                style: Toast.Style.Failure,
                title: "Failed to fetch report",
                message: error instanceof Error ? error.message : "An unknown error occurred"
            });
        }
    };

    return (
        <Form
            actions={
                <ActionPanel>
                    <Action.SubmitForm title="View Report" onSubmit={handleSubmit} />
                </ActionPanel>
            }
        >
            <Form.TextField
                id="reportId"
                title="Report ID"
                placeholder="Enter the report ID"
                value={reportId}
                onChange={setReportId}
            />
        </Form>
    );
}