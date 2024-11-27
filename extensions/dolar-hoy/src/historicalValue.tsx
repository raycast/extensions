import { Action, ActionPanel, Detail, Form, Toast, showToast, useNavigation } from "@raycast/api";
import { useFetch, useForm } from "@raycast/utils";
import { Currency, ResponseType } from "./types";
import { API_URL } from "./constants";
import { useEffect, useState } from "react";
import { format, isFuture } from "date-fns";
import { getCurrencyName } from "./utils";

type HistoricalFormValues = {
  date: Date | null;
};

export default function Command() {
  const { push } = useNavigation();

  const { handleSubmit, itemProps, setValidationError } = useForm<HistoricalFormValues>({
    onSubmit: (values) => {
      values.date && push(<HistoricalValue date={values.date} />);
    },
    validation: {
      date: (value) => {
        if (!value) return "Date is required";
        else if (value && isFuture(value)) return "Date can not be future";
      },
    },
  });

  /*
   * Note: we had to add a custom onChange handler to be able to reset errors when value changes.
   */
  const handleOnChange = (newValue: Date | null) => {
    setValidationError("date", undefined);
    itemProps?.date?.onChange && itemProps.date.onChange(newValue);
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit}></Action.SubmitForm>
        </ActionPanel>
      }
    >
      <Form.DatePicker title={"Date"} {...itemProps.date} onChange={handleOnChange} />
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
