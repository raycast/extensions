import { useState } from "react";
import { ConversionResult } from "../types";
import { parseTimestamp, parseTimeString, isTimestamp } from "../utils/parseTime";
import { timestampToDateFormats, dateToTimestamps } from "../utils/formatTime";
import { TIME_FORMATS } from "../constants/timeFormats";
import { Icon } from "@raycast/api";

/**
 * Time conversion hook
 * @returns Time conversion related states and functions
 */
export const useTimeConverter = () => {
  const [conversionResult, setConversionResult] = useState<ConversionResult>([]);

  /**
   * Handle time conversion
   * @param input User input string
   * @returns Whether the conversion was successful
   */
  const convertTime = (input: string): boolean => {
    if (!input.trim()) {
      return false;
    }

    // Determine input type and process accordingly
    if (isTimestamp(input)) {
      // Parse timestamp
      const timestampDate = parseTimestamp(input);
      if (timestampDate) {
        setConversionResult(timestampToDateFormats(timestampDate));
        return true;
      }
    } else {
      // Parse time string
      const timeDate = parseTimeString(input);
      if (timeDate) {
        setConversionResult(dateToTimestamps(timeDate));
        return true;
      }
    }

    // Unable to parse, display error
    setConversionResult([
      {
        id: "invalid-input",
        icon: Icon.ExclamationMark,
        title: "Invalid Input",
        subtitle: `Please enter a valid timestamp or date format. Supported: unix timestamp, ISO 8601, ${TIME_FORMATS.filter(
          (f) => f !== "ISO",
        )
          .slice(0, 2)
          .join(", ")}...`,
        accessory: "See all formats",
        value: `Supported formats: unix timestamp (seconds/milliseconds), ISO 8601, ${TIME_FORMATS.filter((f) => f !== "ISO").join(", ")}`,
      },
    ]);

    return false;
  };

  return {
    conversionResult,
    convertTime,
  };
};
