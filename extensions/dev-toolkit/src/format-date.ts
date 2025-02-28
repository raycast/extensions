import { LaunchProps } from "@raycast/api";
import { format, parseISO } from "date-fns";
import { produceOutput, showError } from "./utils";

// Define the format type as a union of string literals
type FormatType = "iso" | "short" | "medium" | "long" | "full" | "time" | "rfc" | "sql" | "compact" | "relative";

const FORMATS: Record<FormatType, string> = {
  iso: "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'",
  short: "MM/dd/yyyy",
  medium: "MMM d, yyyy",
  long: "MMMM d, yyyy",
  full: "EEEE, MMMM d, yyyy 'at' h:mm a",
  time: "h:mm a",
  rfc: "EEE, dd MMM yyyy HH:mm:ss 'GMT'",
  sql: "yyyy-MM-dd HH:mm:ss",
  compact: "yyyyMMdd",
  relative: "EEEE 'next week'",
};

export default async function Command(props?: LaunchProps<{ arguments: Arguments.FormatDate }>) {
  try {
    const formatTypeInput = (props?.arguments.formatType || "medium").toLowerCase();
    const dateString = props?.arguments.date;

    // Check if formatType is valid
    const formatType = formatTypeInput as FormatType;
    if (!Object.keys(FORMATS).includes(formatType)) {
      throw new Error(`Invalid format type: ${formatTypeInput}`);
    }

    let date: Date;
    if (dateString) {
      // Try to parse the provided date string
      try {
        date = parseISO(dateString.trim());
        if (isNaN(date.getTime())) {
          date = new Date(dateString.trim());
        }
      } catch {
        date = new Date(dateString.trim());
      }
    } else {
      // Use current date if no date is provided
      date = new Date();
    }

    if (isNaN(date.getTime())) {
      throw new Error("Invalid date");
    }

    // Now TypeScript knows formatType is a valid key
    const formatString = FORMATS[formatType];
    const formattedDate = format(date, formatString);

    await produceOutput(formattedDate);
  } catch (error) {
    await showError("Failed to format date: " + String(error));
  }
}
