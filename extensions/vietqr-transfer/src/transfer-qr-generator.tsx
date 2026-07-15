import { Form, ActionPanel, Action, useNavigation, Icon } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useState } from "react";
import { Bank, FormValues } from "./types";
import { QRResult } from "./components/QRResult";

export default function Command() {
  const { push } = useNavigation();
  const { data, isLoading } = useFetch<{ data: Bank[] }>("https://api.vietqr.io/v2/banks");
  const [selectedBankBin, setSelectedBankBin] = useState<string>("");

  const [accountError, setAccountError] = useState<string | undefined>();
  const [amountError, setAmountError] = useState<string | undefined>();

  function dropError(field: "account" | "amount") {
    if (field === "account" && accountError) setAccountError(undefined);
    if (field === "amount" && amountError) setAmountError(undefined);
  }

  const handleSubmit = (values: FormValues) => {
    let hasError = false;

    if (!values.account) {
      setAccountError("Account number is required");
      hasError = true;
    } else if (!/^\d+$/.test(values.account)) {
      setAccountError("Digits only");
      hasError = true;
    }

    if (values.amount && isNaN(Number(values.amount))) {
      setAmountError("Must be a valid number");
      hasError = true;
    }

    if (hasError || !selectedBankBin) return;

    const memoEncoded = encodeURIComponent(values.memo || "");
    const qrUrl = `https://img.vietqr.io/image/${selectedBankBin}-${values.account}-${values.template}.png?amount=${values.amount || 0}&addInfo=${memoEncoded}&raycast-height=350`;

    push(<QRResult url={qrUrl} />);
  };

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.Link} title="Generate QR Code" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Dropdown id="bank" title="Bank" onChange={(value) => setSelectedBankBin(value)}>
        {data?.data.map((b) => (
          <Form.Dropdown.Item key={b.bin} value={b.bin} title={b.shortName} />
        ))}
      </Form.Dropdown>

      <Form.TextField
        id="account"
        title="Account Number"
        placeholder="Enter account number"
        error={accountError}
        onChange={() => dropError("account")}
        onBlur={(event) => {
          const value = event.target.value;
          if (!value) setAccountError("Field cannot be empty");
          else if (!/^\d+$/.test(value)) setAccountError("Digits only");
        }}
      />
      <Form.TextField
        id="amount"
        title="Amount"
        placeholder="Optional (e.g. 10000)"
        error={amountError}
        onChange={() => dropError("amount")}
      />
      <Form.TextArea id="memo" title="Description" placeholder="Optional" />

      <Form.Dropdown id="template" title="Template">
        <Form.Dropdown.Item value="compact" title="Compact" />
        <Form.Dropdown.Item value="qr_only" title="QR Only" />
        <Form.Dropdown.Item value="print" title="Print" />
      </Form.Dropdown>
    </Form>
  );
}
