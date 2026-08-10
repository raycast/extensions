import { Detail, showToast, Toast } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { ENDPOINTS, HEADERS } from "./utils/constants";
import { PrinterStatusResponse } from "./types/printer_status";
import { PrinterStatusError } from "./components/printerStatusError";
import { PrinterStatusDetails } from "./components/printerStatusDetails";

export default function PrinterStatus() {
  const { data, isLoading, error } = useFetch(ENDPOINTS.printerStatus, {
    headers: HEADERS,
    async onWillExecute() {
      await showToast({
        title: `Fetching printing status...`,
        style: Toast.Style.Animated,
      });
    },
    mapResult(result: PrinterStatusResponse) {
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
  } else {
    return <PrinterStatusDetails data={data} />;
  }
}
