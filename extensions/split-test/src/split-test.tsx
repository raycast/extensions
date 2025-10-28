import { Action, ActionPanel, Form } from "@raycast/api";
import { useState } from "react";

type FormValues = {
  draft: string;
  controlTraffic: string;
  controlConversions: string;
  variantTraffic: string;
  variantConversions: string;
  confidenceLevel: string;
  hypothesis: string;
};

type TestResult = {
  controlRate: number;
  variantRate: number;
  relativeChange: number;
  confidenceLevel: number;
  pValue: number;
  isSignificant: boolean;
};
function erfApprox(x: number): number {
  const sign = x >= 0 ? 1 : -1;
  x = Math.abs(x);
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;
  const t = 1.0 / (1.0 + p * x);
  const y = 1.0 - ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
  return sign * y;
}

function normalCDF(z: number): number {
  return (1.0 + erfApprox(z / Math.sqrt(2.0))) / 2.0;
}

function calculateZStatistic(
  controlConversions: number,
  controlTraffic: number,
  variantConversions: number,
  variantTraffic: number,
): number {
  const p1 = controlConversions / controlTraffic;
  const p2 = variantConversions / variantTraffic;

  const pooledP = (controlConversions + variantConversions) / (controlTraffic + variantTraffic);
  const se = Math.sqrt(pooledP * (1 - pooledP) * (1 / controlTraffic + 1 / variantTraffic));

  if (se === 0) return 0;
  return (p2 - p1) / se;
}

function calculatePValue(zStat: number, hypothesis: string): number {
  if (hypothesis === "two-sided") {
    return 2 * (1 - normalCDF(Math.abs(zStat)));
  } else if (hypothesis === "greater") {
    return 1 - normalCDF(zStat);
  } else {
    return normalCDF(zStat);
  }
}

function calculateActualConfidenceLevel(zStat: number, hypothesis: string): number {
  let pValue: number;

  if (hypothesis === "two-sided") {
    pValue = 2 * (1 - normalCDF(Math.abs(zStat)));
  } else if (hypothesis === "greater") {
    pValue = 1 - normalCDF(zStat);
  } else {
    pValue = normalCDF(zStat);
  }

  const confidenceLevel = (1 - pValue) * 100;
  return Math.max(0, Math.min(100, confidenceLevel));
}

function calculateTestResults(values: FormValues): TestResult | null {
  const controlTraffic = parseFloat(values.controlTraffic);
  const controlConversions = parseFloat(values.controlConversions);
  const variantTraffic = parseFloat(values.variantTraffic);
  const variantConversions = parseFloat(values.variantConversions);
  const confidenceLevel = parseFloat(values.confidenceLevel);

  if (
    isNaN(controlTraffic) ||
    isNaN(controlConversions) ||
    isNaN(variantTraffic) ||
    isNaN(variantConversions) ||
    controlTraffic <= 0 ||
    variantTraffic <= 0 ||
    controlConversions > controlTraffic ||
    variantConversions > variantTraffic
  ) {
    return null;
  }

  const controlRate = controlConversions / controlTraffic;
  const variantRate = variantConversions / variantTraffic;
  const relativeChange = ((variantRate - controlRate) / controlRate) * 100;

  const zStat = calculateZStatistic(controlConversions, controlTraffic, variantConversions, variantTraffic);
  const pValue = calculatePValue(zStat, values.hypothesis);
  const actualConfidenceLevel = calculateActualConfidenceLevel(zStat, values.hypothesis);

  const desiredAlpha = (100 - confidenceLevel) / 100;
  const isSignificant = pValue < desiredAlpha;

  return {
    controlRate: controlRate * 100,
    variantRate: variantRate * 100,
    relativeChange,
    confidenceLevel: actualConfidenceLevel,
    pValue,
    isSignificant,
  };
}

export default function Command() {
  const [results, setResults] = useState<TestResult | null>(null);
  const [formValues, setFormValues] = useState<FormValues | null>(null);

  function handleSubmit(values: FormValues) {
    const testResults = calculateTestResults(values);
    setResults(testResults);
    setFormValues(values);
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Calculate Results" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text="A/B Test Statistical Significance Calculator" />

      <Form.TextArea id="draft" title="" placeholder="Enter notes or draft text" />

      <Form.Separator />

      <Form.TextField
        id="controlTraffic"
        title="Traffic in Control"
        placeholder="Enter number of visitors"
        info="Total number of visitors in the control group"
      />

      <Form.TextField
        id="controlConversions"
        title="Conversions in Control"
        placeholder="Enter number of conversions"
        info="Number of conversions in the control group"
      />

      <Form.Separator />

      <Form.TextField
        id="variantTraffic"
        title="Traffic in Variant"
        placeholder="Enter number of visitors"
        info="Total number of visitors in the variant group"
      />

      <Form.TextField
        id="variantConversions"
        title="Conversions in Variant"
        placeholder="Enter number of conversions"
        info="Number of conversions in the variant group"
      />

      <Form.Separator />

      <Form.Dropdown id="confidenceLevel" title="Desired Confidence Level" defaultValue="90">
        <Form.Dropdown.Item value="90" title="90%" />
        <Form.Dropdown.Item value="95" title="95%" />
        <Form.Dropdown.Item value="99" title="99%" />
      </Form.Dropdown>

      <Form.Dropdown id="hypothesis" title="Hypothesis" defaultValue="two-sided">
        <Form.Dropdown.Item value="greater" title="Greater (one-tailed)" />
        <Form.Dropdown.Item value="two-sided" title="Two-sided" />
        <Form.Dropdown.Item value="less" title="Less (one-tailed)" />
      </Form.Dropdown>

      {results && formValues && (
        <>
          <Form.Separator />
          <Form.TextArea
            id="results"
            title="Results"
            value={`${results.isSignificant ? "✅ Statistically Significant" : "❌ Not Statistically Significant"}
- Confidence Level: ${results.confidenceLevel.toFixed(2)}%
- Relative Change: ${results.relativeChange > 0 ? "+" : ""}${results.relativeChange.toFixed(2)}%
- Control Conversion Rate: ${results.controlRate.toFixed(2)}%
- Variant Conversion Rate: ${results.variantRate.toFixed(2)}%
- P-Value: ${results.pValue.toFixed(4)}

Result: C: ${formValues.controlTraffic} > ${formValues.controlConversions}, ${results.controlRate.toFixed(2)}%. T1: ${formValues.variantTraffic} > ${formValues.variantConversions}, ${results.variantRate.toFixed(2)}%. Relative change: ${results.relativeChange > 0 ? "+" : ""}${results.relativeChange.toFixed(2)}%. Confidence: ${results.confidenceLevel.toFixed(2)}%. Hypothesis: ${formValues.hypothesis === "two-sided" ? "Two-sided" : formValues.hypothesis === "greater" ? "Greater (one-tailed)" : "Less (one-tailed)"}`}
          />
        </>
      )}
    </Form>
  );
}
