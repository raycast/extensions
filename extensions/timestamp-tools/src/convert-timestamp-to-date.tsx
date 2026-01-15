import { Form, ActionPanel, Action, showToast } from "@raycast/api";
import { useState } from "react";

const dateFormats = [
  { value: "YYYY-MM-DD HH:mm:ss", title: "2023-01-15 14:30:00" },
  { value: "YYYY/MM/DD HH:mm:ss", title: "2023/01/15 14:30:00" },
  { value: "MM-DD-YYYY HH:mm:ss", title: "01-15-2023 14:30:00" },
  { value: "MMMM D, YYYY h:mm A", title: "January 15, 2023 2:30 PM" },
  { value: "YYYY年MM月DD日 HH时mm分ss秒", title: "2023-01-15 14:30:00" },
];

const timeZones = [
  { value: "Asia/Shanghai", title: "Shanghai (UTC+8)" },
  { value: "UTC", title: "Coordinated Universal Time (UTC)" },
  { value: "America/New_York", title: "New York (UTC-5/-4)" },
  { value: "Europe/London", title: "London (UTC+0/+1)" },
  { value: "Asia/Tokyo", title: "Tokyo (UTC+9)" },
  { value: "America/Los_Angeles", title: "Los Angeles (UTC-8/-7)" },
];

export default function Command() {
  const [timestamp, setTimestamp] = useState<string>("");
  const [selectedFormat, setSelectedFormat] = useState<string>(dateFormats[0].value);
  const [selectedTimeZone, setSelectedTimeZone] = useState<string>(timeZones[0].value);
  const [result, setResult] = useState<string>("");

  function convertTimestamp() {
    if (!timestamp) {
      showToast({ title: "Error", message: "Please enter a timestamp" });
      return;
    }

    const timestampNum = Number(timestamp);
    let date: Date;

    // Auto-detect seconds vs milliseconds
    if (timestamp.length <= 11) {
      // Seconds timestamp (10 digits or less)
      date = new Date(timestampNum * 1000);
    } else {
      // Milliseconds timestamp (13 digits)
      date = new Date(timestampNum);
    }

    if (isNaN(date.getTime())) {
      showToast({ title: "Error", message: "Invalid timestamp" });
      return;
    }

    let formattedDate = "";

    try {
      // Get date components in specified timezone
      const getTimeInZone = (fmt: Intl.DateTimeFormat) => {
        const parts = fmt.formatToParts(date);
        const getPart = (type: string) => parts.find((p) => p.type === type)?.value || "0";
        return {
          year: getPart("year"),
          month: getPart("month"),
          day: getPart("day"),
          hour: getPart("hour"),
          minute: getPart("minute"),
          second: getPart("second"),
        };
      };

      const formatter = new Intl.DateTimeFormat("en-US", {
        timeZone: selectedTimeZone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      });

      const parts = getTimeInZone(formatter);

      switch (selectedFormat) {
        case "YYYY-MM-DD HH:mm:ss":
          formattedDate = `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}:${parts.second}`;
          break;
        case "YYYY/MM/DD HH:mm:ss":
          formattedDate = `${parts.year}/${parts.month}/${parts.day} ${parts.hour}:${parts.minute}:${parts.second}`;
          break;
        case "MM-DD-YYYY HH:mm:ss":
          formattedDate = `${parts.month}-${parts.day}-${parts.year} ${parts.hour}:${parts.minute}:${parts.second}`;
          break;
        case "MMMM D, YYYY h:mm A": {
          const monthFormatter = new Intl.DateTimeFormat("en-US", {
            timeZone: selectedTimeZone,
            month: "long",
            year: "numeric",
          });
          const monthYear = monthFormatter.format(date);
          const timeFormatter = new Intl.DateTimeFormat("en-US", {
            timeZone: selectedTimeZone,
            hour: "numeric",
            minute: "2-digit",
            hour12: true,
          });
          formattedDate = `${monthYear} ${parts.day}, ${parts.hour}:${parts.minute} ${parts.hour >= 12 ? "PM" : "AM"}`;
          // Reformat time to correct format
          const timeParts = timeFormatter.format(date).split(" ");
          formattedDate = `${monthYear} ${parts.day}, ${timeParts[0]} ${timeParts[1]}`;
          break;
        }
        case "YYYY年MM月DD日 HH时mm分ss秒":
          formattedDate = `${parts.year}年${parts.month}月${parts.day}日 ${parts.hour}时${parts.minute}分${parts.second}秒`;
          break;
        default:
          formattedDate = `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}:${parts.second}`;
      }
    } catch (error) {
      showToast({
        title: "Error",
        message: "Invalid timezone" + (error instanceof Error ? error.message : String(error)),
      });
      return;
    }

    setResult(formattedDate);
    showToast({ title: "Success", message: "Timestamp converted to date" });
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={convertTimestamp} title="Convert Timestamp" />
          <Action.CopyToClipboard content={result} shortcut={{ modifiers: ["cmd"], key: "c" }} />
        </ActionPanel>
      }
    >
      <Form.Description text="Convert Unix timestamp to human-readable date" />
      <Form.TextField
        id="timestamp"
        title="Unix Timestamp"
        placeholder="Enter timestamp (e.g. 1673793000)"
        value={timestamp}
        onChange={setTimestamp}
      />
      <Form.Dropdown id="format" title="Date Format" value={selectedFormat} onChange={setSelectedFormat}>
        {dateFormats.map((format) => (
          <Form.Dropdown.Item key={format.value} value={format.value} title={format.title} />
        ))}
      </Form.Dropdown>
      <Form.Dropdown id="timezone" title="Timezone" value={selectedTimeZone} onChange={setSelectedTimeZone}>
        {timeZones.map((zone) => (
          <Form.Dropdown.Item key={zone.value} value={zone.value} title={zone.title} />
        ))}
      </Form.Dropdown>
      <Form.Separator />
      <Form.TextArea id="result" title="Result" value={result} onChange={() => {}} />
    </Form>
  );
}
