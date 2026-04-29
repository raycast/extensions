import {
  Action,
  ActionPanel,
  Detail,
  Form,
  Icon,
  useNavigation,
} from "@raycast/api";
import { useState } from "react";
import FormulaReference from "./formula-reference";
import {
  Result,
  SampleSizeResult,
  oneProportionTest,
  sampleSizeMeans,
  sampleSizeOneProportion,
  sampleSizeProportion,
  twoProportionTest,
  welchTTest,
} from "./statistics";

type Mode = "analyze" | "plan";
type TestType = "oneProportion" | "proportion" | "means";
type MdeType = "relative" | "absolute";

export default function Command() {
  const { push } = useNavigation();
  const [mode, setMode] = useState<Mode>("analyze");
  const [testType, setTestType] = useState<TestType>("proportion");
  const [mdeType, setMdeType] = useState<MdeType>("relative");
  const [error, setError] = useState<string | undefined>();

  function parseNumber(value: string, label: string): number {
    const n = Number((value ?? "").replace(",", "."));
    if (!Number.isFinite(n)) throw new Error(`${label} must be a number.`);
    return n;
  }

  function parsePercent(value: string, label: string): number {
    return parseNumber(value, label) / 100;
  }

  function handleSubmit(values: Record<string, string>) {
    try {
      if (mode === "analyze") {
        const confidenceLevel = parseNumber(
          values.confidenceLevel,
          "Confidence level",
        );
        let result: Result;
        let inputs: Record<string, string>;
        if (testType === "oneProportion") {
          const nullProportion = parsePercent(
            values.nullProportion,
            "Null proportion",
          );
          result = oneProportionTest({
            successes: parseNumber(values.successes, "Successes"),
            trials: parseNumber(values.trials, "Trials"),
            nullProportion,
            confidenceLevel,
          });
          inputs = {
            "Observed successes / trials": `${values.successes} / ${values.trials}`,
            "Null proportion (H₀)": `${values.nullProportion}%`,
          };
        } else if (testType === "proportion") {
          result = twoProportionTest({
            successesA: parseNumber(values.successesA, "Control successes"),
            trialsA: parseNumber(values.trialsA, "Control trials"),
            successesB: parseNumber(values.successesB, "Treatment successes"),
            trialsB: parseNumber(values.trialsB, "Treatment trials"),
            confidenceLevel,
          });
          inputs = {
            "Control successes / trials": `${values.successesA} / ${values.trialsA}`,
            "Treatment successes / trials": `${values.successesB} / ${values.trialsB}`,
          };
        } else {
          result = welchTTest({
            meanA: parseNumber(values.meanA, "Control mean"),
            stdA: parseNumber(values.stdA, "Control std dev"),
            nA: parseNumber(values.nA, "Control N"),
            meanB: parseNumber(values.meanB, "Treatment mean"),
            stdB: parseNumber(values.stdB, "Treatment std dev"),
            nB: parseNumber(values.nB, "Treatment N"),
            confidenceLevel,
          });
          inputs = {
            "Control (mean ± SD, n)": `${values.meanA} ± ${values.stdA}, n=${values.nA}`,
            "Treatment (mean ± SD, n)": `${values.meanB} ± ${values.stdB}, n=${values.nB}`,
          };
        }
        push(
          <AnalyzeResultView
            result={result}
            confidenceLevel={confidenceLevel}
            inputs={inputs}
          />,
        );
      } else {
        const alpha = parsePercent(values.alpha, "Alpha");
        const power = parsePercent(values.power, "Power");
        const twoSided = values.tail !== "one";
        const dailyUsers =
          values.dailyUsers && values.dailyUsers.trim() !== ""
            ? parseNumber(values.dailyUsers, "Daily users")
            : null;

        let result: SampleSizeResult;
        let inputs: Record<string, string>;
        if (testType === "oneProportion") {
          const baseline = parsePercent(values.baseline, "Null proportion");
          const mde = parsePercent(values.mde, "MDE");
          result = sampleSizeOneProportion({
            baseline,
            mde,
            mdeType,
            alpha,
            power,
            twoSided,
          });
          inputs = {
            "Null proportion (H₀)": `${values.baseline}%`,
            "Minimum detectable effect": `${values.mde}% (${mdeType})`,
            "Alternative rate (target)": `${(result.p2! * 100).toFixed(3)}%`,
          };
        } else if (testType === "proportion") {
          const baseline = parsePercent(values.baseline, "Baseline");
          const mde = parsePercent(values.mde, "MDE");
          result = sampleSizeProportion({
            baseline,
            mde,
            mdeType,
            alpha,
            power,
            twoSided,
          });
          inputs = {
            "Baseline rate": `${values.baseline}%`,
            "Minimum detectable effect": `${values.mde}% (${mdeType})`,
            "Treatment rate (target)": `${(result.p2! * 100).toFixed(3)}%`,
          };
        } else {
          const stdA = parseNumber(values.stdA, "Control std dev");
          const stdB = values.stdB
            ? parseNumber(values.stdB, "Treatment std dev")
            : stdA;
          const mde = parseNumber(values.mde, "MDE");
          result = sampleSizeMeans({ stdA, stdB, mde, alpha, power, twoSided });
          inputs = {
            "Control std dev": values.stdA,
            "Treatment std dev": String(stdB),
            "Minimum detectable effect": values.mde,
          };
        }
        push(
          <PlanResultView
            result={result}
            alpha={alpha}
            power={power}
            twoSided={twoSided}
            inputs={inputs}
            dailyUsers={dailyUsers}
          />,
        );
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            icon={Icon.Calculator}
            title={
              mode === "analyze"
                ? "Calculate Significance"
                : "Calculate Sample Size"
            }
            onSubmit={handleSubmit}
          />
          <Action.Push
            icon={Icon.Book}
            title="View Formula Reference"
            target={
              <FormulaReference initialMode={mode} initialTestType={testType} />
            }
            shortcut={{ modifiers: ["cmd"], key: "r" }}
          />
        </ActionPanel>
      }
    >
      <Form.Dropdown
        id="mode"
        title="Mode"
        value={mode}
        onChange={(v) => setMode(v as Mode)}
      >
        <Form.Dropdown.Item
          value="analyze"
          title="Analyze Results (CI & p-value)"
        />
        <Form.Dropdown.Item value="plan" title="Plan Sample Size (n needed)" />
      </Form.Dropdown>
      <Form.Dropdown
        id="testType"
        title="Test Type"
        value={testType}
        onChange={(v) => setTestType(v as TestType)}
      >
        <Form.Dropdown.Item
          value="oneProportion"
          title="One-Proportion (Single Rate vs Target)"
        />
        <Form.Dropdown.Item
          value="proportion"
          title="Two-Proportion (Conversion / Churn)"
        />
        <Form.Dropdown.Item
          value="means"
          title="Two-Sample Means (Welch's t-test)"
        />
      </Form.Dropdown>
      {error && <Form.Description title="Error" text={error} />}
      <Form.Separator />
      {mode === "analyze" ? (
        <>
          <Form.TextField
            id="confidenceLevel"
            title="Confidence Level (%)"
            defaultValue="95"
            info="Common values: 90, 95, 99"
          />
          {testType === "oneProportion" ? (
            <>
              <Form.Description text="Observed sample" />
              <Form.TextField
                id="successes"
                title="Successes"
                placeholder="e.g. 96"
              />
              <Form.TextField
                id="trials"
                title="Trials"
                placeholder="e.g. 1200"
              />
              <Form.Separator />
              <Form.TextField
                id="nullProportion"
                title="Null Proportion (%)"
                placeholder="e.g. 8 for 8%"
                info="Hypothesized rate to test the observed sample against."
              />
            </>
          ) : testType === "proportion" ? (
            <>
              <Form.Description text="Control (A)" />
              <Form.TextField
                id="successesA"
                title="Successes"
                placeholder="e.g. 96"
              />
              <Form.TextField
                id="trialsA"
                title="Trials"
                placeholder="e.g. 1200"
              />
              <Form.Separator />
              <Form.Description text="Treatment (B)" />
              <Form.TextField
                id="successesB"
                title="Successes"
                placeholder="e.g. 75"
              />
              <Form.TextField
                id="trialsB"
                title="Trials"
                placeholder="e.g. 1250"
              />
            </>
          ) : (
            <>
              <Form.Description text="Control (A)" />
              <Form.TextField id="meanA" title="Mean" placeholder="e.g. 12.4" />
              <Form.TextField
                id="stdA"
                title="Std Dev"
                placeholder="e.g. 3.1"
              />
              <Form.TextField
                id="nA"
                title="Sample Size"
                placeholder="e.g. 500"
              />
              <Form.Separator />
              <Form.Description text="Treatment (B)" />
              <Form.TextField id="meanB" title="Mean" placeholder="e.g. 13.1" />
              <Form.TextField
                id="stdB"
                title="Std Dev"
                placeholder="e.g. 3.4"
              />
              <Form.TextField
                id="nB"
                title="Sample Size"
                placeholder="e.g. 500"
              />
            </>
          )}
        </>
      ) : (
        <>
          <Form.TextField
            id="alpha"
            title="Significance Level α (%)"
            defaultValue="5"
          />
          <Form.TextField
            id="power"
            title="Statistical Power (%)"
            defaultValue="80"
          />
          <Form.Dropdown id="tail" title="Test Tail" defaultValue="two">
            <Form.Dropdown.Item value="two" title="Two-sided" />
            <Form.Dropdown.Item value="one" title="One-sided" />
          </Form.Dropdown>
          <Form.TextField
            id="dailyUsers"
            title="Daily Users (optional)"
            placeholder="e.g. 2000 — used to estimate test duration"
          />
          <Form.Separator />
          {testType === "oneProportion" || testType === "proportion" ? (
            <>
              <Form.TextField
                id="baseline"
                title={
                  testType === "oneProportion"
                    ? "Null Proportion (%)"
                    : "Baseline Rate (%)"
                }
                placeholder={
                  testType === "oneProportion"
                    ? "e.g. 8 for 8% hypothesized rate"
                    : "e.g. 8 for 8% churn"
                }
              />
              <Form.Dropdown
                id="mdeType"
                title="MDE Type"
                value={mdeType}
                onChange={(v) => setMdeType(v as MdeType)}
              >
                <Form.Dropdown.Item
                  value="relative"
                  title={
                    testType === "oneProportion"
                      ? "Relative (% of null)"
                      : "Relative (% of baseline)"
                  }
                />
                <Form.Dropdown.Item
                  value="absolute"
                  title="Absolute (percentage points)"
                />
              </Form.Dropdown>
              <Form.TextField
                id="mde"
                title="Minimum Detectable Effect (%)"
                placeholder={
                  mdeType === "relative"
                    ? "e.g. -10 for −10% relative"
                    : "e.g. -1 for −1pp"
                }
                info={
                  mdeType === "relative"
                    ? "Use a negative number for a reduction."
                    : "Percentage points. Negative for a reduction."
                }
              />
            </>
          ) : (
            <>
              <Form.TextField
                id="stdA"
                title="Control Std Dev"
                placeholder="e.g. 3.1"
              />
              <Form.TextField
                id="stdB"
                title="Treatment Std Dev (optional)"
                placeholder="defaults to control"
              />
              <Form.TextField
                id="mde"
                title="Minimum Detectable Effect"
                placeholder="absolute units"
              />
            </>
          )}
        </>
      )}
    </Form>
  );
}

function fmt(x: number, digits = 4): string {
  if (!Number.isFinite(x)) return String(x);
  if (Math.abs(x) >= 1e6 || (Math.abs(x) > 0 && Math.abs(x) < 1e-4))
    return x.toExponential(3);
  return x.toFixed(digits);
}

function fmtPct(x: number, digits = 2): string {
  return `${(x * 100).toFixed(digits)}%`;
}

function fmtP(p: number): string {
  if (p < 1e-4) return p.toExponential(2);
  return p.toFixed(4);
}

function fmtInt(n: number): string {
  return n.toLocaleString("en-US");
}

function AnalyzeResultView({
  result,
  confidenceLevel,
  inputs,
}: {
  result: Result;
  confidenceLevel: number;
  inputs: Record<string, string>;
}) {
  const ciLabel = `${confidenceLevel}% CI`;
  const verdict = result.significant
    ? `**Statistically significant** at α = ${result.alpha.toFixed(3)}`
    : `**Not significant** at α = ${result.alpha.toFixed(3)}`;

  const isProportion =
    result.kind === "oneProportion" || result.kind === "twoProportion";
  const diffLine = isProportion
    ? `${fmtPct(result.diff)} (absolute)${
        result.diffRelative !== null
          ? `, ${fmtPct(result.diffRelative)} (relative)`
          : ""
      }`
    : `${fmt(result.diff)}${
        result.diffRelative !== null
          ? ` (${fmtPct(result.diffRelative)} relative)`
          : ""
      }`;

  const ciLine = isProportion
    ? `[${fmtPct(result.ciLow)}, ${fmtPct(result.ciHigh)}]`
    : `[${fmt(result.ciLow)}, ${fmt(result.ciHigh)}]`;

  let effectSection: string;
  if (result.kind === "oneProportion") {
    const observed = result.rateA !== undefined ? fmtPct(result.rateA) : "—";
    const hypothesized =
      result.rateB !== undefined ? fmtPct(result.rateB) : "—";
    effectSection = `## Effect
- Observed rate (p̂): **${observed}**
- ${ciLabel} for rate: **${ciLine}**
- Hypothesized rate (p₀): **${hypothesized}**
- Deviation (observed − hypothesized): **${diffLine}**`;
  } else {
    const ratesSection =
      result.rateA !== undefined && result.rateB !== undefined
        ? `\n- Control rate: **${fmtPct(result.rateA)}**\n- Treatment rate: **${fmtPct(result.rateB)}**`
        : "";
    effectSection = `## Effect
- Difference (B − A): **${diffLine}**
- ${ciLabel}: **${ciLine}**${ratesSection}`;
  }

  const dfLine =
    result.df !== undefined
      ? `\n- Degrees of freedom: ${fmt(result.df, 2)}`
      : "";

  const markdown = `# Result

${verdict}

${effectSection}

## Test
- p-value: **${fmtP(result.pValue)}**
- ${result.statisticName}-statistic: ${fmt(result.statistic, 4)}${dfLine}

## Inputs
${Object.entries(inputs)
  .map(([k, v]) => `- ${k}: ${v}`)
  .join("\n")}
- Confidence level: ${confidenceLevel}%
`;

  return (
    <Detail
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard
            title="Copy Summary"
            content={`p=${fmtP(result.pValue)}, ${ciLabel} ${ciLine}, diff=${diffLine}`}
          />
          <Action.CopyToClipboard
            title="Copy P-Value"
            content={fmtP(result.pValue)}
          />
          <Action.CopyToClipboard
            title="Copy Confidence Interval"
            content={ciLine}
          />
        </ActionPanel>
      }
    />
  );
}

function PlanResultView({
  result,
  alpha,
  power,
  twoSided,
  inputs,
  dailyUsers,
}: {
  result: SampleSizeResult;
  alpha: number;
  power: number;
  twoSided: boolean;
  inputs: Record<string, string>;
  dailyUsers: number | null;
}) {
  const isOneSample = result.kind === "oneProportion";
  const durationLine =
    dailyUsers && dailyUsers > 0
      ? `\n- Estimated duration at ${fmtInt(dailyUsers)} users/day${
          isOneSample ? "" : " (split 50/50)"
        }: **${Math.ceil(result.total / dailyUsers)} days**`
      : "";

  const sizeSection = isOneSample
    ? `- Sample size: **${fmtInt(result.total)}**${durationLine}`
    : `- Per group: **${fmtInt(result.perGroup)}**
- Total: **${fmtInt(result.total)}**${durationLine}`;

  const markdown = `# Sample Size

${sizeSection}

## Assumptions
- α = ${alpha.toFixed(3)} (${twoSided ? "two-sided" : "one-sided"})
- Power = ${power.toFixed(3)} (β = ${(1 - power).toFixed(3)})
- \`z_α\` = ${result.zAlpha.toFixed(4)}, \`z_β\` = ${result.zBeta.toFixed(4)}

## Inputs
${Object.entries(inputs)
  .map(([k, v]) => `- ${k}: ${v}`)
  .join("\n")}
`;

  const summary = isOneSample
    ? `n=${result.total} at α=${alpha}, power=${power}`
    : `n=${result.perGroup}/group (${result.total} total) at α=${alpha}, power=${power}`;

  return (
    <Detail
      markdown={markdown}
      actions={
        <ActionPanel>
          {isOneSample ? (
            <Action.CopyToClipboard
              title="Copy Sample Size"
              content={String(result.total)}
            />
          ) : (
            <>
              <Action.CopyToClipboard
                title="Copy Per-Group N"
                content={String(result.perGroup)}
              />
              <Action.CopyToClipboard
                title="Copy Total N"
                content={String(result.total)}
              />
            </>
          )}
          <Action.CopyToClipboard title="Copy Summary" content={summary} />
        </ActionPanel>
      }
    />
  );
}
