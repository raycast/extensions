import { Action, ActionPanel, Clipboard, Form, showHUD } from "@raycast/api";
import { FormValidation, useForm, useLocalStorage } from "@raycast/utils";
import { useEffect, useMemo } from "react";

interface TimestampForm {
  dateObject: Date;
  timestamp: string;
  year: string;
  month: string;
  day: string;
  hour: string;
  minute: string;
  second: string;
  milisecond: string;
  timezone: string;
}

const TIMEZONE_OPTION_REGEX = /^(GMT)|(UTC[+-]\d{1,2})$/;
const timezoneOptions = [
  "GMT",
  "UTC-12",
  "UTC-11",
  "UTC-10",
  "UTC-9",
  "UTC-8",
  "UTC-7",
  "UTC-6",
  "UTC-5",
  "UTC-4",
  "UTC-3",
  "UTC-2",
  "UTC-1",
  "UTC+1",
  "UTC+2",
  "UTC+3",
  "UTC+4",
  "UTC+5",
  "UTC+6",
  "UTC+7",
  "UTC+8",
  "UTC+9",
  "UTC+10",
  "UTC+11",
  "UTC+12",
];

const getCurrentTimezone = (): string => {
  const offset = -new Date().getTimezoneOffset();
  if (offset === 0) return "GMT";
  const sign = offset > 0 ? "+" : "-";
  return `UTC${sign}${Math.abs(offset / 60)}`;
};

const validateTimezone = (timezone: string): boolean => {
  return TIMEZONE_OPTION_REGEX.test(timezone);
};

const parseTimezoneOffset = (timezone: string): number => {
  if (timezone === "GMT" || timezone === "UTC") return 0;

  const match = timezone.match(/^UTC([+-]\d+)$/);
  if (match) {
    return -parseInt(match[1]) * 60; // Convert hours to minutes and invert (UTC+8 means subtract 8 hours)
  }
  return 0;
};

const STORAGE_KEY_USE_MILLISECONDS = "convert-timestamp::use-milliseconds";

export default function Command() {
  const { value: useMilliseconds, setValue: setUseMilliseconds } = useLocalStorage(STORAGE_KEY_USE_MILLISECONDS, false);
  const now = new Date();
  const nowTimestamp = useMilliseconds ? now.getTime() : Math.floor(now.getTime() / 1000);

  const { handleSubmit, itemProps, values, setValue } = useForm<TimestampForm>({
    initialValues: {
      dateObject: now,
      timestamp: nowTimestamp.toString(),
      year: now.getFullYear().toString(),
      month: (now.getMonth() + 1).toString(),
      day: now.getDate().toString(),
      hour: now.getHours().toString(),
      minute: now.getMinutes().toString(),
      second: now.getSeconds().toString(),
      milisecond: now.getMilliseconds().toString(),
      timezone: getCurrentTimezone(),
    },
    validation: {
      timestamp: (value: string | undefined) => {
        if (!value?.match(/^\d{10,13}$/)) {
          return "Invalid timestamp format";
        }
      },
      year: FormValidation.Required,
      month: (value: string | undefined) => {
        if (!value) return "Month is required";
        const month = parseInt(value);
        if (isNaN(month) || month < 1 || month > 12) {
          return "Month must be between 1 and 12";
        }
      },
      day: (value: string | undefined) => {
        if (!value) return "Day is required";
        const day = parseInt(value);
        if (isNaN(day) || day < 1 || day > 31) {
          return "Day must be between 1 and 31";
        }
      },
      hour: (value: string | undefined) => {
        if (!value) return "Hour is required";
        const hour = parseInt(value);
        if (isNaN(hour) || hour < 0 || hour > 23) {
          return "Hour must be between 0 and 23";
        }
      },
      minute: (value: string | undefined) => {
        if (!value) return "Minute is required";
        const minute = parseInt(value);
        if (isNaN(minute) || minute < 0 || minute > 59) {
          return "Minute must be between 0 and 59";
        }
      },
      second: (value: string | undefined) => {
        if (!value) return "Second is required";
        const second = parseInt(value);
        if (isNaN(second) || second < 0 || second > 59) {
          return "Second must be between 0 and 59";
        }
      },
      milisecond: (value: string | undefined) => {
        if (useMilliseconds && !value) return "Milisecond is required";
        const milisecond = parseInt(value ?? "0");
        if (isNaN(milisecond) || milisecond < 0 || milisecond > 999) {
          return "Milisecond must be between 0 and 999";
        }
      },
      timezone: (value: string | undefined) => {
        if (!value) return "Timezone is required";
        if (!validateTimezone(value)) {
          return "Invalid timezone format (use GMT, UTC, UTC+n, or UTC-n)";
        }
      },
    },
    onSubmit: (formValues: TimestampForm) => {
      Clipboard.copy(formValues.timestamp);
      showHUD("Copied to clipboard");
    },
  });

  useEffect(() => {
    Clipboard.read().then((text) => {
      const textContent = text.text ?? "";
      const timestamp = textContent.trim().match(/^\d{10,13}$/)?.[0];
      if (timestamp) {
        updateFromTimestamp(timestamp);
      }
    });
  }, []);

  const updateFromTimestamp = (timestamp: string) => {
    const isMilliseconds = timestamp.length === 13;
    const time = new Date(parseInt(timestamp) * (isMilliseconds ? 1 : 1000));
    updateFromDate(time);
  };

  const updateFromDate = (utcTime: Date) => {
    // Set the timestamp (always in UTC)
    setValue("dateObject", utcTime);
    setValue("timestamp", useMilliseconds ? String(utcTime.getTime()) : String(Math.floor(utcTime.getTime() / 1000)));
    // Adjust the display time for the selected timezone
    const offset = parseTimezoneOffset(values.timezone);
    const displayTime = new Date(utcTime.getTime() - offset * 60 * 1000);

    setValue("year", String(displayTime.getUTCFullYear()));
    setValue("month", String(displayTime.getUTCMonth() + 1));
    setValue("day", String(displayTime.getUTCDate()));
    setValue("hour", String(displayTime.getUTCHours()));
    setValue("minute", String(displayTime.getUTCMinutes()));
    setValue("second", String(displayTime.getUTCSeconds()));
    setValue("milisecond", String(displayTime.getUTCMilliseconds()));
  };

  const updateFromComponents = <K extends keyof TimestampForm>(id: K, value: TimestampForm[K]) => {
    const newValues = { ...values };
    newValues[id] = value;
    setValue(id, value);

    // Create UTC time from components
    const date = new Date(
      Date.UTC(
        parseInt(newValues.year),
        parseInt(newValues.month) - 1,
        parseInt(newValues.day),
        parseInt(newValues.hour),
        parseInt(newValues.minute),
        parseInt(newValues.second),
        parseInt(newValues.milisecond || "0"),
      ),
    );

    if (!isNaN(date.getTime())) {
      // Adjust for timezone to get true UTC time
      const offset = parseTimezoneOffset(newValues.timezone);
      const utcTime = new Date(date.getTime() + offset * 60 * 1000);

      // Set the timestamp using the UTC time
      setValue("dateObject", utcTime);
      setValue("timestamp", useMilliseconds ? String(utcTime.getTime()) : String(Math.floor(utcTime.getTime() / 1000)));
    }
  };

  const utcTimestamp = useMemo(() => {
    const timestamp = parseInt(values.timestamp);
    const utcTime = new Date(useMilliseconds ? timestamp : timestamp * 1000);
    return utcTime;
  }, [values.timestamp]);

  const gmtText = useMemo(() => {
    return utcTimestamp.toUTCString();
  }, [utcTimestamp]);

  const localText = useMemo(() => {
    const offset = parseTimezoneOffset(values.timezone);
    const localTime = new Date(utcTimestamp.getTime() - offset * 60 * 1000);
    const utcString = localTime.toUTCString();
    return `${utcString.slice(0, utcString.indexOf(" GMT"))} ${values.timezone}`;
  }, [utcTimestamp]);

  const relativeText = useMemo(() => {
    const now = new Date();
    const diffMs = now.getTime() - utcTimestamp.getTime();
    const diffSec = Math.floor(Math.abs(diffMs) / 1000);
    const isFuture = diffMs < 0;

    if (Math.abs(diffSec) < 30) return "Just now";
    if (diffSec < 60) {
      return isFuture ? "Less than a minute from now" : "Less than a minute ago";
    }
    if (diffSec < 3600) {
      const mins = Math.floor(diffSec / 60);
      return isFuture ? `${mins} minute${mins > 1 ? "s" : ""} from now` : `${mins} minute${mins > 1 ? "s" : ""} ago`;
    }
    if (diffSec < 86400) {
      const hours = Math.floor(diffSec / 3600);
      return isFuture ? `${hours} hour${hours > 1 ? "s" : ""} from now` : `${hours} hour${hours > 1 ? "s" : ""} ago`;
    }
    const days = Math.floor(diffSec / 86400);
    return isFuture ? `${days} day${days > 1 ? "s" : ""} from now` : `${days} day${days > 1 ? "s" : ""} ago`;
  }, [utcTimestamp]);

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Copy Timestamp" onSubmit={handleSubmit} />
          <Action title="Toggle Milliseconds" onAction={() => setUseMilliseconds(!useMilliseconds)} />
        </ActionPanel>
      }
    >
      <Form.TextField
        {...itemProps.timestamp}
        autoFocus
        title="Unix Timestamp"
        onChange={(value) => {
          setValue("timestamp", value);
          if (value.match(/^\d{10,13}$/)) {
            updateFromTimestamp(value);
          }
        }}
      />
      {/** @ts-expect-error itemProps should be correct */}
      <Form.DatePicker
        {...itemProps.dateObject}
        title="Date"
        onChange={(value) => {
          if (value) {
            updateFromDate(value);
          }
        }}
      />
      <Form.Description title="GMT" text={gmtText} />
      <Form.Description title="Local" text={localText} />
      <Form.Description title="Relative" text={relativeText} />
      <Form.Separator />
      <Form.TextField
        {...itemProps.year}
        title="Year"
        onChange={(value) => {
          updateFromComponents("year", value);
        }}
      />
      <Form.TextField
        {...itemProps.month}
        title="Month"
        onChange={(value) => {
          updateFromComponents("month", value);
        }}
      />
      <Form.TextField
        {...itemProps.day}
        title="Day"
        onChange={(value) => {
          updateFromComponents("day", value);
        }}
      />
      <Form.TextField
        {...itemProps.hour}
        title="Hour"
        onChange={(value) => {
          updateFromComponents("hour", value);
        }}
      />
      <Form.TextField
        {...itemProps.minute}
        title="Minute"
        onChange={(value) => {
          updateFromComponents("minute", value);
        }}
      />
      <Form.TextField
        {...itemProps.second}
        title="Second"
        onChange={(value) => {
          updateFromComponents("second", value);
        }}
      />
      {useMilliseconds && (
        <Form.TextField
          {...itemProps.milisecond}
          title="Milisecond"
          onChange={(value) => {
            updateFromComponents("milisecond", value);
          }}
        />
      )}
      <Form.Dropdown
        {...itemProps.timezone}
        title="Timezone"
        onChange={(value) => {
          updateFromComponents("timezone", value);
        }}
      >
        {timezoneOptions.map((option) => (
          <Form.Dropdown.Item key={option} value={option} title={option} />
        ))}
      </Form.Dropdown>
    </Form>
  );
}
