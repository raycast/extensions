import { Form } from "@raycast/api";
import { useMemo, useState } from "react";
import { Result } from "./components/Result";
import { calculateAverage } from "./utils/calculator";
import { AverageResult, FormValues } from "./types";

const EMPTY_VALUES: FormValues = {
  oldPrice: "",
  oldLot: "",
  newPrice: "",
  newLot: "",
};

const EMPTY_FIELDS_MESSAGE = "Fill all fields";
const INVALID_VALUE_MESSAGE = "Value must be greater than zero";

export default function Command() {
  const [values, setValues] = useState<FormValues>(EMPTY_VALUES);
  const { result, message } = useMemo(() => evaluate(values), [values]);

  function handleChange(field: keyof FormValues) {
    return (value: string) => setValues((previous) => ({ ...previous, [field]: value }));
  }

  return (
    <Form>
      <Form.TextField
        id="oldPrice"
        title="Harga Lama"
        info="Harga saham yang sudah dibeli"
        placeholder="106.97"
        autoFocus
        value={values.oldPrice}
        onChange={handleChange("oldPrice")}
      />
      <Form.TextField
        id="oldLot"
        title="Lot Lama"
        info="Jumlah lot yang sudah dibeli"
        placeholder="15"
        value={values.oldLot}
        onChange={handleChange("oldLot")}
      />
      <Form.TextField
        id="newPrice"
        title="Harga Baru"
        info="Harga baru saham yang akan dibeli"
        placeholder="80"
        value={values.newPrice}
        onChange={handleChange("newPrice")}
      />
      <Form.TextField
        id="newLot"
        title="Lot Baru"
        info="Jumlah lot yang akan dibeli"
        placeholder="10"
        value={values.newLot}
        onChange={handleChange("newLot")}
      />
      <Result result={result} message={message} />
    </Form>
  );
}

/**
 * Parses Indonesian number notation where "." groups thousands and "," separates
 * decimals, while still accepting "." as a decimal separator when unambiguous
 * (e.g. "106.97"). Examples: "9.500" -> 9500, "106,97" -> 106.97, "106.97" -> 106.97
 */
function parseNumber(value: string): number {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return NaN;
  }

  if (trimmed.includes(",")) {
    // Indonesian decimal comma: dots are thousands separators.
    return Number(trimmed.replaceAll(".", "").replace(",", "."));
  }

  const dotCount = (trimmed.match(/\./g) ?? []).length;
  if (dotCount === 0) {
    return Number(trimmed);
  }

  if (dotCount > 1) {
    // Multiple dots can only be thousands separators.
    return Number(trimmed.replaceAll(".", ""));
  }

  // Single dot: 3 digits after the dot implies thousands (e.g. "9.500").
  const [, fraction = ""] = trimmed.split(".");
  if (fraction.length === 3) {
    return Number(trimmed.replaceAll(".", ""));
  }

  return Number(trimmed);
}

function isPositiveNumber(value: number): boolean {
  return Number.isFinite(value) && value > 0;
}

function isPositiveInteger(value: number): boolean {
  return isPositiveNumber(value) && Number.isInteger(value);
}

/**
 * Validates and calculates the result for the current form values.
 * Returns either a `result` (when every field is valid) or a `message`
 * explaining why the calculation was skipped.
 */
function evaluate(values: FormValues): { result: AverageResult | null; message: string | null } {
  const isMissingField = Object.values(values).some((value) => value.trim().length === 0);
  if (isMissingField) {
    return { result: null, message: EMPTY_FIELDS_MESSAGE };
  }

  const oldPrice = parseNumber(values.oldPrice);
  const oldLot = parseNumber(values.oldLot);
  const newPrice = parseNumber(values.newPrice);
  const newLot = parseNumber(values.newLot);

  const isValid =
    isPositiveNumber(oldPrice) && isPositiveInteger(oldLot) && isPositiveNumber(newPrice) && isPositiveInteger(newLot);

  if (!isValid) {
    return { result: null, message: INVALID_VALUE_MESSAGE };
  }

  return { result: calculateAverage({ oldPrice, oldLot, newPrice, newLot }), message: null };
}
