import { Form, ActionPanel, Action, showToast } from "@raycast/api";
import { useState } from "react";

const differenceUnits = [
  { value: "days", title: "Days" },
  { value: "months", title: "Months" },
  { value: "years", title: "Years" },
];

export default function Command() {
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [selectedUnit, setSelectedUnit] = useState<string>(differenceUnits[0].value);
  const [result, setResult] = useState<string>("");

  function calculateDifference() {
    if (!startDate || !endDate) {
      showToast({ title: "Error", message: "Please enter start and end dates" });
      return;
    }

    let start: Date;
    let end: Date;

    // 处理开始日期
    if (/^\d{4}-\d{2}-\d{2}$/.test(startDate)) {
      start = new Date(`${startDate}T00:00:00`);
    } else {
      start = new Date(startDate);
    }

    // 处理结束日期
    if (/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
      end = new Date(`${endDate}T00:00:00`);
    } else {
      end = new Date(endDate);
    }

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      showToast({ title: "Error", message: "Invalid date format" });
      return;
    }

    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    let resultText = "";

    switch (selectedUnit) {
      case "days":
        resultText = `${diffDays} days`;
        break;
      case "months": {
        const months = Math.floor(diffDays / 30);
        resultText = `${months} months`;
        break;
      }
      case "years": {
        const years = Math.floor(diffDays / 365);
        resultText = `${years} years`;
        break;
      }
    }

    setResult(resultText);
    showToast({ title: "Success", message: "Date difference calculation completed" });
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={calculateDifference} title="Calculate Difference" />
        </ActionPanel>
      }
    >
      <Form.Description text="Calculate the difference between two dates" />
      <Form.TextField
        id="startDate"
        title="Start Date"
        placeholder="Enter start date (YYYY-MM-DD)"
        value={startDate}
        onChange={setStartDate}
      />
      <Form.TextField
        id="endDate"
        title="End Date"
        placeholder="Enter end date (YYYY-MM-DD)"
        value={endDate}
        onChange={setEndDate}
      />
      <Form.Dropdown id="unit" title="Unit" value={selectedUnit} onChange={setSelectedUnit}>
        {differenceUnits.map((unit) => (
          <Form.Dropdown.Item key={unit.value} value={unit.value} title={unit.title} />
        ))}
      </Form.Dropdown>
      <Form.Separator />
      <Form.TextArea id="result" title="Result" value={result} onChange={() => {}} />
    </Form>
  );
}
