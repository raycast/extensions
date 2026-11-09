import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useMemo, useState } from "react";
import { solveEquation, type SolveResult } from "./solver";

const EXAMPLES = ["x+15=20", "1/5=3/x", "(20-Va)/10+(15-Va)/5=Va/5", "y^2-5y+6=0"];

const SUPPORTED_MD = `
## Supported

- **One unknown** — a letter or a name: \`x\`, \`y\`, \`z\`, \`Va\`, \`Vout\`, \`x1\`, … (names match case-insensitively)
- **Linear & quadratic** equations (degree 1 or 2)
- \`+  -  *  /  ^\` and parentheses
- Implicit multiplication: \`2x\`, \`3(x+2)\`, \`(x+1)(x-1)\`
- Decimals and fractions: \`0.5x=1.5\`, \`x/15=2\`
- Unknown in a denominator: \`1/5=3/x\`, \`(x+1)/(x-1)=2\` — denominators are cleared, and roots that make a denominator 0 are rejected

## Not supported yet

- Two or more unknowns (\`x+y=10\`)
- Degree 3+ (after clearing denominators), roots, trig, logs
`;

function resultMarkdown(equation: string, result: Extract<SolveResult, { ok: true }>): string {
  const steps = result.steps.map((step) => `- ${step}`).join("\n");
  return `# ${result.answerText}\n\n**Equation:** \`${equation}\`\n\n**Standard form:** \`${result.standardForm}\`\n\n## Steps\n\n${steps}\n`;
}

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const equation = searchText.trim();

  const result = useMemo<SolveResult | null>(() => {
    if (!equation) return null;
    return solveEquation(equation);
  }, [equation]);

  return (
    <List
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Type an equation, e.g. x+15=20"
      isShowingDetail={equation.length > 0}
      throttle
    >
      {equation.length === 0 && (
        <List.Section title="Equation Solver" subtitle="Type an equation above — or pick an example">
          {EXAMPLES.map((example) => {
            const exampleResult = solveEquation(example);
            return (
              <List.Item
                key={example}
                icon={Icon.Calculator}
                title={example}
                subtitle={exampleResult.ok ? exampleResult.answerText : undefined}
                actions={
                  <ActionPanel>
                    <Action title="Solve This Example" icon={Icon.ArrowRight} onAction={() => setSearchText(example)} />
                    <Action.CopyToClipboard title="Copy Example" content={example} />
                  </ActionPanel>
                }
              />
            );
          })}
        </List.Section>
      )}

      {result?.ok && (
        <List.Section title="Result">
          <List.Item
            icon={Icon.CheckCircle}
            title={result.answerText}
            subtitle={equation}
            detail={<List.Item.Detail markdown={resultMarkdown(equation, result)} />}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard title="Copy Answer" content={result.answerText} />
                <Action.CopyToClipboard
                  title="Copy Equation and Answer"
                  content={`${equation}  →  ${result.answerText}`}
                />
              </ActionPanel>
            }
          />
        </List.Section>
      )}

      {result && !result.ok && (
        <List.Section title="Result">
          <List.Item
            icon={Icon.ExclamationMark}
            title="Can't solve that yet"
            subtitle={result.error}
            detail={<List.Item.Detail markdown={`# Can't solve that yet\n\n${result.error}\n${SUPPORTED_MD}`} />}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard title="Copy Equation" content={equation} />
              </ActionPanel>
            }
          />
        </List.Section>
      )}
    </List>
  );
}
