import { ActionPanel, Action, Form, LocalStorage } from "@raycast/api";
import { useEffect, useState } from "react";

const GST_RATES = ["0", "3", "5", "12", "18", "28"];

function formatRateValue(rate: number): string {
  if (isNaN(rate) || !isFinite(rate)) return "—";
  return String(rate);
}

function formatIndian(num: number): string {
  if (isNaN(num) || !isFinite(num)) return "—";
  const [intPart, decPart] = num.toFixed(2).split(".");
  if (intPart.length <= 3) return "₹" + intPart + "." + decPart;
  const lastThree = intPart.slice(-3);
  const rest = intPart.slice(0, -3);
  const formattedRest = rest.replace(/\B(?=(\d{2})+(?!\d))/g, ",");
  return "₹" + formattedRest + "," + lastThree + "." + decPart;
}

function calcGST(amount: number, rate: number, mode: string) {
  if (mode === "exclusive") {
    const gst = (amount * rate) / 100;
    return { base: amount, gst, total: amount + gst };
  } else {
    const base = amount / (1 + rate / 100);
    const gst = amount - base;
    return { base, gst, total: amount };
  }
}

export default function Command() {
  const [amount, setAmount] = useState("");
  const [gstRate, setGstRate] = useState("18");
  const [customRate, setCustomRate] = useState("");
  const [calcMode, setCalcMode] = useState("exclusive");
  const [taxType, setTaxType] = useState("intra");
  const [amountError, setAmountError] = useState<string | undefined>();
  const [customRateError, setCustomRateError] = useState<string | undefined>();

  useEffect(() => {
    async function loadPrefs() {
      const savedRate = await LocalStorage.getItem<string>("lastGstRate");
      const savedTaxType = await LocalStorage.getItem<string>("lastTaxType");
      if (savedRate) setGstRate(savedRate);
      if (savedTaxType) setTaxType(savedTaxType);
    }
    loadPrefs();
  }, []);

  const parsedCustomRate = parseFloat(customRate);
  const effectiveRate = gstRate === "custom" ? parsedCustomRate : parseFloat(gstRate);
  const parsedAmount = parseFloat(amount);
  const isValidAmount = amount.trim() !== "" && !isNaN(parsedAmount) && parsedAmount >= 0;
  const isValidRate =
    gstRate !== "custom"
      ? !isNaN(effectiveRate) && effectiveRate >= 0
      : customRate.trim() !== "" && !isNaN(parsedCustomRate) && parsedCustomRate >= 0;
  const isValid = isValidAmount && isValidRate;

  const { base, gst, total } = isValid ? calcGST(parsedAmount, effectiveRate, calcMode) : { base: 0, gst: 0, total: 0 };

  const cgst = gst / 2;
  const sgst = gst / 2;

  const breakdown =
    taxType === "intra"
      ? `Base Amount: ${formatIndian(base)}\nCGST (${formatRateValue(effectiveRate / 2)}%): ${formatIndian(cgst)}\nSGST (${formatRateValue(effectiveRate / 2)}%): ${formatIndian(sgst)}\nTotal: ${formatIndian(total)}`
      : `Base Amount: ${formatIndian(base)}\nIGST (${formatRateValue(effectiveRate)}%): ${formatIndian(gst)}\nTotal: ${formatIndian(total)}`;

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy Total" content={isValid ? total.toFixed(2) : "0.00"} />
          <Action.CopyToClipboard title="Copy Base Amount" content={isValid ? base.toFixed(2) : "0.00"} />
          <Action.CopyToClipboard title="Copy GST Amount" content={isValid ? gst.toFixed(2) : "0.00"} />
          <Action.CopyToClipboard title="Copy Full Breakdown" content={breakdown} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="amount"
        title="Amount"
        placeholder="e.g. 10000"
        value={amount}
        autoFocus
        onChange={(v) => {
          setAmount(v);
          if (amountError) setAmountError(undefined);
        }}
        onBlur={() => {
          if (amount.trim() && (isNaN(parseFloat(amount)) || parseFloat(amount) < 0)) {
            setAmountError("Enter a valid positive number");
          }
        }}
        error={amountError}
      />
      <Form.Dropdown
        id="gstRate"
        title="GST Rate"
        value={gstRate}
        onChange={(v) => {
          setGstRate(v);
          LocalStorage.setItem("lastGstRate", v);
        }}
      >
        {GST_RATES.map((r) => (
          <Form.Dropdown.Item key={r} value={r} title={r + "%"} />
        ))}
        <Form.Dropdown.Item value="custom" title="Custom" />
      </Form.Dropdown>
      {gstRate === "custom" && (
        <Form.TextField
          id="customRate"
          title="Custom Rate (%)"
          placeholder="e.g. 6"
          value={customRate}
          onChange={(v) => {
            setCustomRate(v);
            if (customRateError) setCustomRateError(undefined);
          }}
          onBlur={() => {
            if (customRate.trim() && (isNaN(parsedCustomRate) || parsedCustomRate < 0)) {
              setCustomRateError("Enter a valid rate of 0 or higher");
            }
          }}
          error={customRateError}
        />
      )}
      <Form.Dropdown id="calcMode" title="Calculation Mode" value={calcMode} onChange={setCalcMode}>
        <Form.Dropdown.Item value="exclusive" title="Add GST (exclusive)" />
        <Form.Dropdown.Item value="inclusive" title="Extract GST (inclusive)" />
      </Form.Dropdown>
      <Form.Dropdown
        id="taxType"
        title="Tax Type"
        value={taxType}
        onChange={(v) => {
          setTaxType(v);
          LocalStorage.setItem("lastTaxType", v);
        }}
      >
        <Form.Dropdown.Item value="intra" title="CGST + SGST (intra-state)" />
        <Form.Dropdown.Item value="inter" title="IGST (inter-state)" />
      </Form.Dropdown>
      <Form.Separator />
      <Form.Description title="Base Amount" text={isValid ? formatIndian(base) : "—"} />
      {taxType === "intra" ? (
        <>
          <Form.Description
            title={`CGST (${formatRateValue(effectiveRate / 2)}%)`}
            text={isValid ? formatIndian(cgst) : "—"}
          />
          <Form.Description
            title={`SGST (${formatRateValue(effectiveRate / 2)}%)`}
            text={isValid ? formatIndian(sgst) : "—"}
          />
        </>
      ) : (
        <Form.Description
          title={`IGST (${formatRateValue(effectiveRate)}%)`}
          text={isValid ? formatIndian(gst) : "—"}
        />
      )}
      <Form.Description title="Total Amount" text={isValid ? formatIndian(total) : "—"} />
    </Form>
  );
}
