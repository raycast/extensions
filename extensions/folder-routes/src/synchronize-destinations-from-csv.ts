import { Toast, getPreferenceValues, showHUD, showToast } from "@raycast/api";

import { CsvSynchronizationError, synchronizeDestinationsFromCsv } from "./services/csv-synchronization";
import { resolveDestinationsCsvPath } from "./services/destination-csv";

interface Preferences {
  destinationsCsvFile?: string;
}

export default async function Command() {
  const { destinationsCsvFile } = getPreferenceValues<Preferences>();

  try {
    const count = await synchronizeDestinationsFromCsv(resolveDestinationsCsvPath(destinationsCsvFile));
    await showHUD(`Synchronized ${count} destination${count === 1 ? "" : "s"} from CSV`);
  } catch (error) {
    const errors =
      error instanceof CsvSynchronizationError
        ? error.errors
        : [error instanceof Error ? error.message : String(error)];
    await showToast({
      style: Toast.Style.Failure,
      title: "CSV Synchronization Failed",
      message: errors.length === 1 ? errors[0] : `${errors[0]} (+${errors.length - 1} more)`,
    });
  }
}
