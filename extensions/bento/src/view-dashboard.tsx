import React, { useState, useEffect } from "react";
import { Detail, LocalStorage, showToast, Toast } from "@raycast/api";
import { getMultipleReports, ReportData } from "./api-client";
import { renderToStaticMarkup } from "react-dom/server";
import { Chart } from "./Chart";

const width = 600; // Slightly smaller width for dashboard charts
const height = 300; // Slightly smaller height for dashboard charts

export default function ViewDashboard() {
  const [reports, setReports] = useState<ReportData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchReports = async () => {
      try {
        const storedIds = await LocalStorage.getItem<string>("dashboardReportIds");
        if (storedIds) {
          const reportIds = JSON.parse(storedIds);
          const nonEmptyReportIds = reportIds.filter((id: string) => id.trim() !== "");
          if (nonEmptyReportIds.length > 0) {
            const fetchedReports = await getMultipleReports(nonEmptyReportIds);
            setReports(fetchedReports);
          } else {
            showToast({
              style: Toast.Style.Failure,
              title: "No Reports Configured",
              message: "Please configure report IDs in the dashboard settings",
            });
          }
        } else {
          showToast({
            style: Toast.Style.Failure,
            title: "No Reports Configured",
            message: "Please configure report IDs in the dashboard settings",
          });
        }
      } catch (error) {
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to fetch reports",
          message: error instanceof Error ? error.message : "An unknown error occurred",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchReports();
  }, []);

  const generateChartMarkdown = (report: ReportData, index: number) => {
    const chartSvg = renderToStaticMarkup(
      <Chart report={report} width={width} height={height} gradientId={`line-gradient-${index}`} />
    );
    const chartDataUrl = `data:image/svg+xml;base64,${Buffer.from(chartSvg).toString("base64")}`;
    return `
## ${report.report_name}

![Chart](${chartDataUrl})

- **Report Type**: ${report.report_type}
- **Chart Style**: ${report.chart_style}
    `;
  };

  const markdown = `
# Dashboard

${reports.map((report, index) => generateChartMarkdown(report, index)).join("\n\n")}
  `;

  return <Detail markdown={markdown} isLoading={isLoading} />;
}
