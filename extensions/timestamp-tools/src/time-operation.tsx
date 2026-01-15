import { Form, ActionPanel, Action, showToast } from "@raycast/api";
import { useState } from "react";

const operationUnits = [
  { value: "years", title: "Years" },
  { value: "months", title: "Months" },
  { value: "days", title: "Days" },
];

export default function Command() {
  const [baseDate, setBaseDate] = useState<string>("");
  const [amount, setAmount] = useState<string>("");
  const [selectedUnit, setSelectedUnit] = useState<string>(operationUnits[0].value);
  const [result, setResult] = useState<string>("");

  function performOperation() {
    if (!baseDate || !amount) {
      showToast({ title: "Error", message: "Please enter base date and amount" });
      return;
    }

    const amountNum = Number(amount);
    if (isNaN(amountNum)) {
      showToast({ title: "Error", message: "Please enter a valid number" });
      return;
    }

    let base: Date;
    if (/^\d{4}-\d{2}-\d{2}$/.test(baseDate)) {
      base = new Date(`${baseDate}T00:00:00`);
    } else {
      base = new Date(baseDate);
    }

    if (isNaN(base.getTime())) {
      showToast({ title: "Error", message: "Invalid base date format" });
      return;
    }

    const resultDate = new Date(base);

    switch (selectedUnit) {
      case "years":
        resultDate.setFullYear(resultDate.getFullYear() + amountNum);
        break;
      case "months":
        resultDate.setMonth(resultDate.getMonth() + amountNum);
        break;
      case "days":
        resultDate.setDate(resultDate.getDate() + amountNum);
        break;
    }

    const formattedResult = resultDate.toISOString().split("T")[0];
    setResult(formattedResult);
    showToast({ title: "Success", message: "Time operation completed" });
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={performOperation} title="Perform Operation" />
          <Action.CopyToClipboard content={result} shortcut={{ modifiers: ["cmd"], key: "c" }} />
        </ActionPanel>
      }
    >
      <Form.Description text="Add years/months/days to a specified date" />
      <Form.TextField
        id="baseDate"
        title="Base Date"
        placeholder="Enter base date (YYYY-MM-DD)"
        value={baseDate}
        onChange={setBaseDate}
      />
      <Form.TextField
        id="amount"
        title="Amount"
        placeholder="Enter amount to add"
        value={amount}
        onChange={setAmount}
      />
      <Form.Dropdown id="unit" title="Unit" value={selectedUnit} onChange={setSelectedUnit}>
        {operationUnits.map((unit) => (
          <Form.Dropdown.Item key={unit.value} value={unit.value} title={unit.title} />
        ))}
      </Form.Dropdown>
      <Form.Separator />
      <Form.TextArea id="result" title="Result" value={result} onChange={() => {}} />
    </Form>
  );
}
