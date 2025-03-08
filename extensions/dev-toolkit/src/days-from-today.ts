import { LaunchProps } from "@raycast/api";
import { addDays, format } from "date-fns";
import { produceOutput, safeNumberArg, showError } from "./utils";

export default async function Command(props?: LaunchProps<{ arguments: Arguments.DaysFromToday }>) {
  const daysArg = props?.arguments.days;
  const formatArg = props?.arguments.format || "EEEE, MMMM d, yyyy";

  const { error, safeNumber } = await safeNumberArg(daysArg, { min: -3650, max: 3650, default: 0 });

  if (error) {
    await showError(error.message);
  } else {
    const today = new Date();
    const resultDate = addDays(today, safeNumber);
    const formattedDate = format(resultDate, formatArg);

    await produceOutput(formattedDate);
  }
}
