import {
  Action,
  ActionPanel,
  Detail,
  environment,
  Icon,
  List,
} from "@raycast/api";
import { useEffect, useMemo, useState } from "react";
import {
  MenuBarDateStyle,
  readMenuBarDisplaySettings,
} from "./lib/menu-bar-display-settings";
import { buildQuickAddPlan } from "./lib/quick-add-plan";
import type { QuickAddPlan } from "./lib/quick-add-plan";

type MatrixCase = {
  name: string;
  when: string;
  details?: string;
  dateStyle: MenuBarDateStyle;
  expect: (plan: QuickAddPlan) => boolean;
  expectError?: boolean;
};

type MatrixResult = MatrixCase & {
  passed: boolean;
  plan?: QuickAddPlan;
  error?: string;
};

const FIXED_NOW = new Date(2026, 8, 8, 11, 30, 0, 0); // Tue 8 Sep 2026

const MATRIX: MatrixCase[] = [
  {
    name: "Tomorrow becomes all-day",
    when: "tomorrow",
    dateStyle: "day-month",
    expect: (plan) =>
      plan.kind === "all-day" &&
      plan.startDate === "2026-09-09" &&
      plan.endDate === "2026-09-10",
  },
  {
    name: "Friday becomes all-day",
    when: "Friday",
    dateStyle: "day-month",
    expect: (plan) =>
      plan.kind === "all-day" && plan.startDate === "2026-09-11",
  },
  {
    name: "Next Friday stays next-week Friday",
    when: "next Friday",
    dateStyle: "day-month",
    expect: (plan) =>
      plan.kind === "all-day" && plan.startDate === "2026-09-18",
  },
  {
    name: "UK DD/MM all-day",
    when: "15/09",
    dateStyle: "day-month",
    expect: (plan) =>
      plan.kind === "all-day" && plan.startDate === "2026-09-15",
  },
  {
    name: "UK rejects MM/DD-only value",
    when: "09/15",
    dateStyle: "day-month",
    expectError: true,
    expect: () => false,
  },
  {
    name: "US MM/DD all-day",
    when: "09/15",
    dateStyle: "month-day",
    expect: (plan) =>
      plan.kind === "all-day" && plan.startDate === "2026-09-15",
  },
  {
    name: "US rejects DD/MM-only value",
    when: "15/09",
    dateStyle: "month-day",
    expectError: true,
    expect: () => false,
  },
  {
    name: "ISO all-day works regardless of style",
    when: "2026-09-15",
    dateStyle: "month-day",
    expect: (plan) =>
      plan.kind === "all-day" && plan.startDate === "2026-09-15",
  },
  {
    name: "Date plus time stays timed",
    when: "Friday 5pm",
    dateStyle: "day-month",
    expect: (plan) =>
      plan.kind === "timed" &&
      plan.start.getDate() === 11 &&
      plan.start.getHours() === 17 &&
      plan.durationMinutes === 60,
  },
  {
    name: "US numeric date plus time",
    when: "09/15 5pm",
    dateStyle: "month-day",
    expect: (plan) =>
      plan.kind === "timed" &&
      plan.start.getDate() === 15 &&
      plan.start.getHours() === 17,
  },
  {
    name: "Blank all-day duration defaults to one day",
    when: "Friday",
    dateStyle: "day-month",
    expect: (plan) =>
      plan.kind === "all-day" &&
      plan.durationDays === 1 &&
      plan.endDate === "2026-09-12",
  },
  {
    name: "3d creates a three-day all-day event",
    when: "Friday",
    details: "3d",
    dateStyle: "day-month",
    expect: (plan) =>
      plan.kind === "all-day" &&
      plan.durationDays === 3 &&
      plan.endDate === "2026-09-14",
  },
  {
    name: "Hour duration without a time is rejected",
    when: "Friday",
    details: "2h",
    dateStyle: "day-month",
    expectError: true,
    expect: () => false,
  },
  {
    name: "Blank timed duration remains one hour",
    when: "Friday 5pm",
    dateStyle: "day-month",
    expect: (plan) => plan.kind === "timed" && plan.durationMinutes === 60,
  },
];

function runMatrixCase(test: MatrixCase): MatrixResult {
  try {
    const plan = buildQuickAddPlan(
      {
        title: "Parser Test",
        when: test.when,
        details: test.details,
      },
      test.dateStyle,
      FIXED_NOW,
    );

    return {
      ...test,
      passed: !test.expectError && test.expect(plan),
      plan,
    };
  } catch (error) {
    return {
      ...test,
      passed: Boolean(test.expectError),
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

function payloadText(plan: QuickAddPlan): string {
  return JSON.stringify(
    {
      summary: plan.summary,
      ...plan.googlePayload,
      location: plan.location || undefined,
      description: plan.description || undefined,
      reminders: { useDefault: true },
    },
    null,
    2,
  );
}

function resultMarkdown(result: MatrixResult): string {
  const style = result.dateStyle === "month-day" ? "US · MM/DD" : "UK · DD/MM";
  const details = result.details || "(blank)";

  if (result.error) {
    return `# ${result.passed ? "✅" : "❌"} ${result.name}\n\n**Reference time:** Tue 8 Sep 2026 · 11:30am\n\n**Date format:** ${style}\n\n**When:** \`${result.when}\`\n\n**Details:** \`${details}\`\n\n**Parser result:** Error\n\n> ${result.error}\n\n**No Google Calendar event was created.**`;
  }

  const plan = result.plan!;
  return `# ${result.passed ? "✅" : "❌"} ${result.name}\n\n**Reference time:** Tue 8 Sep 2026 · 11:30am\n\n**Date format:** ${style}\n\n**When:** \`${result.when}\`\n\n**Details:** \`${details}\`\n\n**Type:** ${plan.kind === "all-day" ? "All-day" : "Timed"}\n\n**Would display:** ${plan.humanWhen} · ${plan.durationLabel}\n\n## Google payload\n\n\`\`\`json\n${payloadText(plan)}\n\`\`\`\n\n**No Google Calendar event was created.**`;
}

export default function Command() {
  const [dateStyle, setDateStyle] = useState<MenuBarDateStyle>("day-month");

  useEffect(() => {
    void readMenuBarDisplaySettings().then((settings) =>
      setDateStyle(settings.dateStyle),
    );
  }, []);

  const results = useMemo(() => MATRIX.map(runMatrixCase), []);
  const passed = results.filter((result) => result.passed).length;

  if (!environment.isDevelopment) {
    return (
      <Detail
        navigationTitle="Test Quick Add Parsing"
        markdown="### Development-only command\n\nThis parser test bench does not create Google Calendar events."
      />
    );
  }

  return (
    <List
      navigationTitle="Test Quick Add Parsing"
      searchBarPlaceholder="Search parser tests…"
    >
      <List.Section
        title={`Built-in Matrix · ${passed}/${results.length} passed`}
        subtitle="Fixed reference: Tue 8 Sep 2026 · 11:30am · No Google events created"
      >
        {results.map((result) => (
          <List.Item
            key={`${result.dateStyle}:${result.name}`}
            title={`${result.passed ? "✅" : "❌"} ${result.name}`}
            subtitle={`${result.dateStyle === "month-day" ? "US" : "UK"} · ${result.when}${result.details ? ` · ${result.details}` : ""}`}
            accessories={[
              {
                text: result.error
                  ? result.passed
                    ? "Expected error"
                    : "Unexpected error"
                  : result.plan?.kind === "all-day"
                    ? "All-day"
                    : "Timed",
              },
            ]}
            actions={
              <ActionPanel>
                <Action.Push
                  title="Inspect Dry Run"
                  icon={Icon.Eye}
                  target={
                    <Detail
                      navigationTitle="Parser Test Result"
                      markdown={resultMarkdown(result)}
                    />
                  }
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>

      <List.Section title="Current App Setting">
        <List.Item
          title={
            dateStyle === "month-day" ? "US — MM/DD/YYYY" : "UK — DD/MM/YYYY"
          }
          subtitle="Calendar Settings → Date Format controls numeric Quick Add input and menu-bar display"
          icon={Icon.Calendar}
        />
      </List.Section>
    </List>
  );
}
