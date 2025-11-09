// details.tsx
import { Detail } from "@raycast/api";

interface DetailsProps {
  a: string;
  b: string;
  c: string;
  x: string;
}

export default function Details({ a, b, c, x }: DetailsProps) {
  const markdown = `
# Illustration

![](illustration.png)

## How Rule of Three Works

The Rule of Three is a mathematical method to solve proportions.

**Formula:** If A is to B as C is to X, then:

\`\`\`
X = (C × B) ÷ A
\`\`\`

### Current Calculation

${a && b && c ? `**${a}** is to **${b}** as **${c}** is to **${x || "?"}**` : "Enter values to see the calculation"}

${
  x
    ? `
**Result:** X = ${x}

**Step by step:**
1. Multiply C by B: ${c} × ${b} = ${parseFloat(c) * parseFloat(b)}
2. Divide by A: ${parseFloat(c) * parseFloat(b)} ÷ ${a} = ${x}
`
    : ""
}
`;

  return (
    <Detail
      markdown={markdown}
      navigationTitle="Rule of Three - Illustration"
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="A" text={a || "Not set"} />
          <Detail.Metadata.Label title="B" text={b || "Not set"} />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label title="C" text={c || "Not set"} />
          <Detail.Metadata.Label title="X (Result)" text={x || "Not calculated"} />
        </Detail.Metadata>
      }
    />
  );
}
