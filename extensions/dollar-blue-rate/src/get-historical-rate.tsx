import { Form, ActionPanel, Action, showToast, Toast } from "@raycast/api";
import { useState, useEffect } from "react";
import { fetchHistoricalBlueRate } from "./fetchHistoricalRate";
import { BlueRate } from "./fetchLatestRate";

// Add this interface for the arguments
interface Arguments {
  year?: string;
  month?: string;
  day?: string;
}

export default function Command(props: { arguments: Arguments }) {
  const { year, month, day } = props.arguments;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const [date, setDate] = useState<Date | null>(yesterday);
  const [historicalRate, setHistoricalRate] = useState<BlueRate | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const minDate = new Date("2013-09-30");

  // Use useEffect to set the date from arguments
  useEffect(() => {
    if (year && month && day) {
      const argDate = new Date(`${year}-${month}-${day}`);
      if (!isNaN(argDate.getTime()) && argDate >= minDate && argDate <= today) {
        setDate(argDate);
        handleSubmit();
      } else {
        showToast({ style: Toast.Style.Failure, title: "Invalid date from arguments" });
      }
    }
  }, [year, month, day]);

  async function handleSubmit() {
    const dateToUse = date;
    if (!dateToUse) {
      showToast({ style: Toast.Style.Failure, title: "Please select a date" });
      return;
    }

    if (dateToUse < minDate) {
      showToast({ style: Toast.Style.Failure, title: "Date cannot be before September 30, 2013" });
      return;
    }

    setIsLoading(true);
    try {
      const formattedDate = dateToUse.toISOString().split("T")[0];
      const rate = await fetchHistoricalBlueRate(formattedDate);
      setHistoricalRate(rate);
      showToast({ style: Toast.Style.Success, title: "Historical rate fetched successfully" });
    } catch (error) {
      console.error(error);
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to fetch historical rate",
        message: error instanceof Error ? error.message : "Unknown error occurred",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={() => handleSubmit()} title="Fetch Rate" />
          {historicalRate && (
            <Action.CopyToClipboard
              title="Copy Rate to Clipboard"
              content={historicalRate.value_sell.toString()}
              shortcut={{ modifiers: ["cmd"], key: "c" }}
            />
          )}
        </ActionPanel>
      }
    >
      <Form.DatePicker
        id="historical-date"
        title="Select Date"
        value={date}
        onChange={setDate}
        max={today}
        min={minDate}
        error={
          date && date > today
            ? "Cannot select future dates"
            : date && date < minDate
              ? "Date cannot be before September 30, 2013"
              : undefined
        }
        info="Select a date between September 30, 2013 and today to fetch historical rates"
        storeValue
      />
      {historicalRate && (
        <Form.Description
          title="Historical Blue Rate"
          text={`${historicalRate.value_sell} ARS (${historicalRate.date})`}
        />
      )}
    </Form>
  );
}
