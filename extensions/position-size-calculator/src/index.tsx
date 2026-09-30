// src/index.tsx
import React, { useState } from "react";
import { Form, ActionPanel, Action, getPreferenceValues, showToast, Toast, useNavigation } from "@raycast/api";
import { CalculationMode, Preferences, CalculationInputs, FormValues } from "./types";
import { calculatePositionDetails, formatCurrency } from "./utils";
import ResultsView from "./components/ResultsView";
import { showFailureToast } from "@raycast/utils";

const modes: CalculationMode[] = ["Fixed Price", "RRR-Based", "% SL/Target", "Fixed Risk"];

export default function Command() {
  const { push } = useNavigation();
  const preferences = getPreferenceValues<Preferences>();

  const [formValues, setFormValues] = useState<FormValues>({
    mode: modes[0],
    entry: "",
    slPrice: "",
    targetPrice: "",
    rrr: "2.0",
    slPercent: "2.0",
    targetPercent: "4.0",
    fixedRiskAmt: preferences.capital
      ? (parseFloat(preferences.capital) * (parseFloat(preferences.riskPercent) / 100)).toFixed(0)
      : "2000", // Default fixed risk based on prefs if possible
  });

  const [errors, setErrors] = useState<Partial<Record<keyof FormValues, string | undefined>>>({});

  const handleInputChange = (field: keyof FormValues, value: string) => {
    setFormValues((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const validateInputs = (): boolean => {
    const newErrors: Partial<Record<keyof FormValues, string | undefined>> = {};
    let isValid = true;

    const checkNumeric = (field: keyof FormValues, allowZero = false, allowNegative = false) => {
      const valueStr = formValues[field];
      if (valueStr.trim() === "") {
        newErrors[field] = "Required";
        isValid = false;
        return;
      }
      const value = parseFloat(valueStr);
      if (isNaN(value)) {
        newErrors[field] = "Must be a number";
        isValid = false;
        return;
      }
      if (!allowZero && value === 0) {
        newErrors[field] = "Cannot be zero";
        isValid = false;
        return;
      }
      if (!allowNegative && value < 0) {
        newErrors[field] = "Cannot be negative";
        isValid = false;
        return;
      }
    };

    checkNumeric("entry");

    switch (formValues.mode) {
      case "Fixed Price":
        checkNumeric("slPrice");
        checkNumeric("targetPrice");
        if (parseFloat(formValues.entry) <= parseFloat(formValues.slPrice)) {
          newErrors.slPrice = (newErrors.slPrice ? newErrors.slPrice + "; " : "") + "SL must be below Entry";
          isValid = false;
        }
        if (parseFloat(formValues.entry) >= parseFloat(formValues.targetPrice)) {
          newErrors.targetPrice =
            (newErrors.targetPrice ? newErrors.targetPrice + "; " : "") + "Target must be above Entry";
          isValid = false;
        }
        break;
      case "RRR-Based":
        checkNumeric("slPrice");
        checkNumeric("rrr");
        if (parseFloat(formValues.entry) <= parseFloat(formValues.slPrice)) {
          newErrors.slPrice = (newErrors.slPrice ? newErrors.slPrice + "; " : "") + "SL must be below Entry";
          isValid = false;
        }
        break;
      case "% SL/Target":
        checkNumeric("slPercent");
        checkNumeric("targetPercent");
        break;
      case "Fixed Risk":
        checkNumeric("slPrice");
        checkNumeric("fixedRiskAmt");
        checkNumeric("rrr"); // RRR needed for target calc
        if (parseFloat(formValues.entry) <= parseFloat(formValues.slPrice)) {
          newErrors.slPrice = (newErrors.slPrice ? newErrors.slPrice + "; " : "") + "SL must be below Entry";
          isValid = false;
        }
        break;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleSubmit = () => {
    if (!validateInputs()) {
      showFailureToast("Please check the input fields.", { title: "Validation Failed" });
      return;
    }

    const capital = parseFloat(preferences.capital);
    const riskPercent = parseFloat(preferences.riskPercent);

    if (isNaN(capital) || capital <= 0) {
      showToast(
        Toast.Style.Failure,
        "Invalid Preference: Capital",
        "Please set a valid Capital in extension preferences.",
      );
      return;
    }
    if (isNaN(riskPercent) || riskPercent <= 0) {
      showToast(
        Toast.Style.Failure,
        "Invalid Preference: Risk %",
        "Please set a valid Risk % in extension preferences.",
      );
      return;
    }

    const inputs: CalculationInputs = {
      mode: formValues.mode,
      capital: capital,
      riskPercent: riskPercent,
      entry: parseFloat(formValues.entry),
      slPrice: formValues.slPrice ? parseFloat(formValues.slPrice) : undefined,
      targetPrice: formValues.targetPrice ? parseFloat(formValues.targetPrice) : undefined,
      rrr: formValues.rrr ? parseFloat(formValues.rrr) : undefined,
      slPercent: formValues.slPercent ? parseFloat(formValues.slPercent) : undefined,
      targetPercent: formValues.targetPercent ? parseFloat(formValues.targetPercent) : undefined,
      fixedRiskAmt: formValues.fixedRiskAmt ? parseFloat(formValues.fixedRiskAmt) : undefined,
    };

    const result = calculatePositionDetails(inputs);

    if ("error" in result) {
      showFailureToast(result.error, { title: "Calculation Error" });
    } else {
      showToast(Toast.Style.Success, "Calculation Complete");
      push(<ResultsView results={result} currencyCode={preferences.currencyCode} />);
    }
  };

  return (
    <Form
      navigationTitle="Position Size Calculator"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Calculate" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description
        title="User Preferences"
        text={`Capital: ${formatCurrency(parseFloat(preferences.capital), preferences.currencyCode)} | Risk/Trade: ${preferences.riskPercent}% | Currency: ${preferences.currencyCode.toUpperCase()} (Editable in Raycast Settings)`}
      />
      <Form.Separator />

      <Form.Dropdown
        id="mode"
        title="Calculation Mode"
        info="Select the method to calculate Stop Loss and Target."
        value={formValues.mode}
        onChange={(newValue) => handleInputChange("mode", newValue as CalculationMode)}
      >
        {modes.map((m) => (
          <Form.Dropdown.Item key={m} value={m} title={m} />
        ))}
      </Form.Dropdown>

      <Form.TextField
        id="entry"
        title="Entry Price"
        placeholder="e.g., 100.50"
        info="The price at which you plan to enter the trade."
        value={formValues.entry}
        error={errors.entry}
        onChange={(val) => handleInputChange("entry", val)}
        onBlur={() => validateInputs()}
      />

      {/* Conditional Fields based on Mode */}
      {formValues.mode === "Fixed Price" && (
        <>
          <Form.TextField
            id="slPrice"
            title="Stop Loss Price"
            placeholder="e.g., 98.00"
            info="The exact price level for your stop loss."
            value={formValues.slPrice}
            error={errors.slPrice}
            onChange={(val) => handleInputChange("slPrice", val)}
            onBlur={() => validateInputs()}
          />
          <Form.TextField
            id="targetPrice"
            title="Target Price"
            placeholder="e.g., 105.00"
            info="The exact price level for your profit target."
            value={formValues.targetPrice}
            error={errors.targetPrice}
            onChange={(val) => handleInputChange("targetPrice", val)}
            onBlur={() => validateInputs()}
          />
        </>
      )}

      {formValues.mode === "RRR-Based" && (
        <>
          <Form.TextField
            id="slPrice"
            title="Stop Loss Price"
            placeholder="e.g., 98.00"
            info="The exact price level for your stop loss."
            value={formValues.slPrice}
            error={errors.slPrice}
            onChange={(val) => handleInputChange("slPrice", val)}
            onBlur={() => validateInputs()}
          />
          <Form.TextField
            id="rrr"
            title="Reward/Risk Ratio (RRR)"
            placeholder="e.g., 2.5"
            info="Desired reward multiple compared to your risk (Target will be calculated)."
            value={formValues.rrr}
            error={errors.rrr}
            onChange={(val) => handleInputChange("rrr", val)}
            onBlur={() => validateInputs()}
          />
        </>
      )}

      {formValues.mode === "% SL/Target" && (
        <>
          <Form.TextField
            id="slPercent"
            title="Stop Loss %"
            placeholder="e.g., 2.0 for 2%"
            info="Stop loss distance as a percentage from the entry price."
            value={formValues.slPercent}
            error={errors.slPercent}
            onChange={(val) => handleInputChange("slPercent", val)}
            onBlur={() => validateInputs()}
          />
          <Form.TextField
            id="targetPercent"
            title="Target %"
            placeholder="e.g., 4.0 for 4%"
            info="Profit target distance as a percentage from the entry price."
            value={formValues.targetPercent}
            error={errors.targetPercent}
            onChange={(val) => handleInputChange("targetPercent", val)}
            onBlur={() => validateInputs()}
          />
        </>
      )}

      {formValues.mode === "Fixed Risk" && (
        <>
          <Form.TextField
            id="slPrice"
            title="Stop Loss Price"
            placeholder="e.g., 98.00"
            info="The exact price level for your stop loss."
            value={formValues.slPrice}
            error={errors.slPrice}
            onChange={(val) => handleInputChange("slPrice", val)}
            onBlur={() => validateInputs()}
          />
          <Form.TextField
            id="fixedRiskAmt"
            title="Fixed Risk Amount" // Adjust currency symbol as needed
            placeholder="e.g., 2000"
            info="The exact currency amount you want to risk on this trade."
            value={formValues.fixedRiskAmt}
            error={errors.fixedRiskAmt}
            onChange={(val) => handleInputChange("fixedRiskAmt", val)}
            onBlur={() => validateInputs()}
          />
          <Form.TextField
            id="rrr"
            title="Reward/Risk Ratio (RRR)"
            placeholder="e.g., 2.0"
            info="Desired RRR to calculate the target price for display."
            value={formValues.rrr}
            error={errors.rrr}
            onChange={(val) => handleInputChange("rrr", val)}
            onBlur={() => validateInputs()}
          />
        </>
      )}
    </Form>
  );
}
