import { ActionPanel, Action, Detail, showToast, Toast } from "@raycast/api";
import { JobStatusResponse, PrinterStatusResponse } from "../types/printer_status";
import { ENDPOINTS, HEADERS, octoPrintBaseUrl } from "../utils/constants";
import { useFetch } from "@raycast/utils";
import { PrinterStatusError } from "./printerStatusError";
import { timeCalculator } from "../utils/timeCalculator";

export function PrinterStatusDetails({ data }: { data: PrinterStatusResponse }) {
  switch (data.state.text) {
    case "Operational":
      return <Operational data={data} />;
    case "Printing":
      return <Printing statusData={data} />;
    // ToDo: Add more cases for different states
    case "Paused":
      return <Printing statusData={data} />;
    default:
      return <Detail markdown="# OctoPrint Status - unknown" />;
  }
}

function Operational({ data }: { data: PrinterStatusResponse }) {
  const toolTempActual = data.temperature.tool0.actual;
  const bedTempActual = data.temperature.bed.actual;
  const toolTempTarget = data.temperature.tool0.target;
  const bedTempTarget = data.temperature.bed.target;

  const markdown = `
  # Status
  ## 🖨️ State: ${data.state.text}
  ### 💉 Extruder Temp: ${toolTempActual}°C ➡ ${toolTempTarget}°C
  ### 🛏️ Bed Temp: ${bedTempActual}°C ➡ ${bedTempTarget}°C
  `;

  return (
    <Detail
      markdown={markdown}
      navigationTitle="OctoPrint Status"
      actions={
        <ActionPanel>
          <Action.OpenInBrowser title={"Open OctoPrint"} url={octoPrintBaseUrl} />
        </ActionPanel>
      }
    />
  );
}

function Printing({ statusData }: { statusData: PrinterStatusResponse }) {
  const { data, isLoading, error } = useFetch(ENDPOINTS.jobStatus, {
    headers: HEADERS,
    async onWillExecute() {
      await showToast({
        title: `Fetching OctoPrint Status...`,
        style: Toast.Style.Animated,
      });
    },
    mapResult(result: JobStatusResponse) {
      return {
        data: result,
      };
    },
    async onData() {
      await showToast({
        title: `Successfully fetched status`,
        style: Toast.Style.Success,
      });
    },
    onError(error: Error) {
      showToast({
        title: "Failed to fetch status - OctoPrint instance may be offline",
        message: error.toString(),
        style: Toast.Style.Failure,
      });
    },
    initialData: [],
    keepPreviousData: true,
  });

  while (isLoading) {
    return <Detail isLoading={isLoading} markdown="# Loading printer status" />;
  }

  if (error) {
    return <PrinterStatusError error={error} />;
  }

  const toolTempActual = statusData.temperature.tool0.actual;
  const bedTempActual = statusData.temperature.bed.actual;
  const toolTempTarget = statusData.temperature.tool0.target;
  const bedTempTarget = statusData.temperature.bed.target;

  console.log(`![](https://geps.dev/progress/${data.progress.completion.toFixed(0).toString()})`);
  const markdown = `
  # Status
  ### 🖨️ State: ${data.state}
  ### 💉 Extruder Temp: ${toolTempActual}°C ➡ ${toolTempTarget}°C
  ### 🛏️ Bed Temp: ${bedTempActual}°C ➡ ${bedTempTarget}°C
  
  ### 📄 File: ${data.job.file.name}
  ### 🏗️ Progress: ${data.progress.completion.toFixed(1)}%
  ### ⏱️ Time Elapsed: ${timeCalculator(data.progress.printTime)}
  ### ⏱️ Time Remaining: ${timeCalculator(data.progress.printTimeLeft)}
  
  
  
  `;

  return (
    <Detail
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser title={"Open OctoPrint"} url={octoPrintBaseUrl} />
        </ActionPanel>
      }
    />
  );
}
