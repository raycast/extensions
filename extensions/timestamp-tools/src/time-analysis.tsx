import { Form, ActionPanel, Action, showToast } from "@raycast/api";
import { useState } from "react";

export default function Command() {
  const [inputDate, setInputDate] = useState<string>("");
  const [result, setResult] = useState<string>("");

  function analyzeTime() {
    if (!inputDate) {
      showToast({ title: "Error", message: "Please enter a date" });
      return;
    }

    let date: Date;
    if (/^\d{4}-\d{2}-\d{2}$/.test(inputDate)) {
      date = new Date(`${inputDate}T00:00:00`);
    } else {
      date = new Date(inputDate);
    }
    if (isNaN(date.getTime())) {
      showToast({ title: "Error", message: "Invalid date format" });
      return;
    }

    // Calculate quarter
    const quarter = Math.floor((date.getMonth() + 3) / 3);

    // Calculate week number of the year (ISO week)
    const startOfYear = new Date(date.getFullYear(), 0, 1);
    const pastDaysOfYear = (date.getTime() - startOfYear.getTime()) / 86400000;
    const weekNumber = Math.ceil((pastDaysOfYear + startOfYear.getDay() + 1) / 7);

    // Calculate day of year
    const dayOfYear = Math.floor((date.getTime() - startOfYear.getTime()) / 86400000) + 1;

    // Calculate time components
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const seconds = date.getSeconds();

    const analysisResult = `
📅 Date Analysis Result:

🏷️ Year: ${date.getFullYear()}
📊 Quarter: Q${quarter}
📆 Week: Week ${weekNumber}
📅 Day of Year: Day ${dayOfYear}
⏰ Time: ${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}

📋 Detailed Components:
   • Year: ${date.getFullYear()}
   • Month: ${date.getMonth() + 1}
   • Day: ${date.getDate()}
   • Hour: ${hours}
   • Minute: ${minutes}
   • Second: ${seconds}

🗓️ Full Date: ${date.toLocaleString()}
    `;

    setResult(analysisResult.trim());
    showToast({ title: "Success", message: "Time analysis completed" });
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={analyzeTime} title="Analyze Time" />
          <Action.CopyToClipboard content={result} shortcut={{ modifiers: ["cmd"], key: "c" }} />
        </ActionPanel>
      }
    >
      <Form.Description text="Analyze detailed time information (year/quarter/week/day/hour/minute/second)" />
      <Form.TextField
        id="inputDate"
        title="Input Date"
        placeholder="Enter date (YYYY-MM-DD)"
        value={inputDate}
        onChange={setInputDate}
      />
      <Form.Separator />
      <Form.TextArea id="result" title="Analysis Result" value={result} onChange={() => {}} />
    </Form>
  );
}
