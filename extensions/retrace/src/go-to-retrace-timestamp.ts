import { LocalStorage, type LaunchProps } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import * as chrono from "chrono-node";
import { openRetraceDeeplink } from "./open-retrace-deeplink";

const LAST_TIMESTAMP_KEY = "lastRetraceTimestamp";

function parseUnixTimestamp(input: string): number | null {
  const trimmed = input.trim();
  if (!/^\d{10,13}$/.test(trimmed)) {
    return null;
  }

  const value = Number(trimmed);
  if (!Number.isFinite(value)) {
    return null;
  }

  return trimmed.length === 10 ? value * 1000 : value;
}

type Props = LaunchProps<{ arguments: Arguments.GoToRetraceTimestamp }>;

export default async function Command(props: Props) {
  const timeInput = props.arguments.time?.trim();

  if (!timeInput) {
    await showFailureToast("No time input provided");
    return;
  }

  try {
    let timestampMs: number | null = parseUnixTimestamp(timeInput);

    if (timestampMs === null) {
      let parsedDate: Date | null = null;

      const yPatternStart = /^y(\d+)(?:\s+(.+))?$/i;
      const yPatternEnd = /^(.+?)\s+y(\d+)$/i;

      const matchStart = timeInput.match(yPatternStart);
      const matchEnd = timeInput.match(yPatternEnd);

      if (matchStart || matchEnd) {
        let daysAgo: number;
        let timeStr: string | undefined;

        if (matchStart) {
          daysAgo = parseInt(matchStart[1], 10);
          timeStr = matchStart[2];
        } else {
          timeStr = matchEnd![1];
          daysAgo = parseInt(matchEnd![2], 10);
        }

        const targetDate = new Date();
        targetDate.setDate(targetDate.getDate() - daysAgo);

        if (timeStr) {
          const digitMatch = timeStr.match(/^(\d{3,4})$/);

          if (digitMatch) {
            const digits = digitMatch[1].padStart(4, "0");
            const hours = parseInt(digits.slice(0, 2), 10);
            const minutes = parseInt(digits.slice(2, 4), 10);

            if (hours >= 0 && hours < 24 && minutes >= 0 && minutes < 60) {
              targetDate.setHours(hours, minutes, 0, 0);
            } else {
              await showFailureToast("Invalid time format");
              return;
            }
          } else {
            const parsedTime = chrono.parseDate(timeStr);
            if (!parsedTime) {
              await showFailureToast("Could not parse the time portion");
              return;
            }

            targetDate.setHours(
              parsedTime.getHours(),
              parsedTime.getMinutes(),
              parsedTime.getSeconds(),
              parsedTime.getMilliseconds(),
            );
          }
        }

        parsedDate = targetDate;
      } else {
        parsedDate = chrono.parseDate(timeInput);
      }

      if (!parsedDate) {
        await showFailureToast("Could not parse the time input");
        return;
      }

      timestampMs = parsedDate.getTime();
    }

    if (!Number.isFinite(timestampMs) || timestampMs <= 0) {
      await showFailureToast("Invalid timestamp");
      return;
    }

    await LocalStorage.setItem(LAST_TIMESTAMP_KEY, String(timestampMs));

    const timestampValue = String(timestampMs);
    await openRetraceDeeplink({
      context: "go-to-retrace-timestamp",
      urls: [`retrace://timeline?t=${timestampValue}`, `retrace://timeline?timestamp=${timestampValue}`],
      metadata: {
        input: timeInput,
        timestampMs,
      },
    });
  } catch (error: unknown) {
    await showFailureToast(error, { title: "Error processing time input" });
  }
}
