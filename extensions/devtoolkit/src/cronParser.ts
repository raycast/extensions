import cronstrue from "cronstrue";

export type CronField = {
  label: string;
  value: string;
  description: string;
};

export type CronParseResult = {
  expression: string;
  explanation: string;
  fields: CronField[];
};

const fivePartFieldLabels = [
  "Minute",
  "Hour",
  "Day of Month",
  "Month",
  "Day of Week",
] as const;

const sixPartFieldLabels = [
  "Second",
  "Minute",
  "Hour",
  "Day of Month",
  "Month",
  "Day of Week",
] as const;

const sevenPartFieldLabels = [
  "Second",
  "Minute",
  "Hour",
  "Day of Month",
  "Month",
  "Day of Week",
  "Year",
] as const;

const fieldDescriptions: Record<string, string> = {
  Second: "0-59",
  Minute: "0-59",
  Hour: "0-23",
  "Day of Month": "1-31",
  Month: "1-12 or JAN-DEC",
  "Day of Week": "0-6 or SUN-SAT",
  Year: "optional year",
};

export function parseCronExpression(input: string): CronParseResult {
  const expression = input.trim().replace(/\s+/g, " ");

  if (!expression) {
    throw new Error("Enter a cron expression");
  }

  try {
    return {
      expression,
      explanation: cronstrue.toString(expression),
      fields: describeCronFields(expression),
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not parse expression";
    throw new Error(`Invalid cron expression: ${message}`);
  }
}

function describeCronFields(expression: string): CronField[] {
  if (expression.startsWith("@")) {
    return [
      {
        label: "Nickname",
        value: expression,
        description: "cron shortcut expression",
      },
    ];
  }

  const parts = expression.split(" ");
  const labels = getFieldLabels(parts.length);

  return labels.map((label, index) => ({
    label,
    value: parts[index],
    description: fieldDescriptions[label],
  }));
}

function getFieldLabels(count: number): readonly string[] {
  if (count === 5) {
    return fivePartFieldLabels;
  }

  if (count === 6) {
    return sixPartFieldLabels;
  }

  if (count === 7) {
    return sevenPartFieldLabels;
  }

  throw new Error("Expected 5, 6, or 7 cron fields");
}
