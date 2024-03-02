import { Action, ActionPanel, Detail, Form, Toast, showToast, useNavigation } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { Currency, ResponseType } from "./types";
import { API_URL } from "./constants";
import { useEffect, useState } from "react";
import { format, isFuture } from "date-fns";
import { getCurrencyName } from "./utils";

type HistoricalFormValues = {
  date: Date;
};

export default function Command() {
  const [dateError, setDateError] = useState<string | undefined>();
  const { push } = useNavigation();

  const onSubmit = ({ date }: HistoricalFormValues) => {
    if (isFuture(date)) {
      setDateError("Date can not be future");
    } else {
      push(<HistoricalValue date={date} />);
    }
  };

  const dropDateErrorIfNeeded = (date: Date | null) => {
    if (dateError) {
      if (date && !isFuture(date)) {
        setDateError(undefined);
      }
    }
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={onSubmit}></Action.SubmitForm>
        </ActionPanel>
      }
    >
      <Form.DatePicker id={"date"} title={"Date"} error={dateError} onChange={dropDateErrorIfNeeded} />
    </Form>
  );
}

const HistoricalValue = ({ date }: { date: Date }) => {
  const [formattedDate, setFormattedDate] = useState<string>();
  const {
    isLoading,
    data,
    error: fetchError,
  } = useFetch<ResponseType>(`${API_URL}/historical?day=${formattedDate}`, {
    execute: !!formattedDate,
  });

  useEffect(() => {
    if (date) {
      setFormattedDate(format(date, "yyyy-MM-dd"));
    }
  }, [date]);

  useEffect(() => {
    if (fetchError) {
      showToast({
        style: Toast.Style.Failure,
        title: "Something went wrong",
        message: fetchError.message,
      });
    }
  }, [fetchError]);

  const markdown = `
  ## Historical USD value in ARS

  _Date: ${format(date, "dd/MM/yyyy")}_
  
  | Type                                      | Buy                         | Sell                         |
  | :---------------------------------------- | :-------------------------- | :--------------------------- |
  | ${getCurrencyName(Currency.usd_blue)}     | $${data?.blue.value_buy}    | $${data?.blue.value_sell}    |
  | ${getCurrencyName(Currency.usd_official)} | $${data?.oficial.value_buy} | $${data?.oficial.value_sell} |
  
  _Source: [Bluelytics](https://bluelytics.com.ar/#!/)_
  
  `;
  return <Detail markdown={markdown} isLoading={isLoading || data === undefined} />;
};
