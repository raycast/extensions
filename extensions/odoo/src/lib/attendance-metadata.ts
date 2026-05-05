import { formatElapsed, type AttendanceSummary } from "./attendance-service";

export function nextActionLabel(summary: AttendanceSummary): "Check in" | "Check out" {
  return summary.state === "in" ? "Check out" : "Check in";
}

export function buildSubtitle(summary: AttendanceSummary): string {
  const action = nextActionLabel(summary);
  const today = formatElapsed(summary.todayWorkedMs);
  if (summary.state === "in") {
    const sessionMs = Date.now() - summary.checkIn.getTime();
    return `${action} · Today ${today} · Session ${formatElapsed(sessionMs)}`;
  }
  return `${action} · Today ${today}`;
}

/** Rich markdown for the detail screen. */
export function buildDetailMarkdown(summary: AttendanceSummary): string {
  const today = formatElapsed(summary.todayWorkedMs);
  const status = summary.state === "in" ? "**Checked in** — session running" : "**Checked out** — not on the clock";

  const blocks = [
    `# ${summary.employeeName}`,
    "",
    "> Mindnow Odoo · HR attendance",
    "",
    "## Status",
    "",
    status,
    "",
    "## Today (total worked)",
    "",
    `\`${today}\``,
    "",
  ];

  if (summary.state === "in") {
    const session = formatElapsed(Date.now() - summary.checkIn.getTime());
    blocks.push(
      "## Current session",
      "",
      `\`${session}\``,
      "",
      "## Checked in at",
      "",
      summary.checkIn.toLocaleString(),
      "",
    );
  }

  blocks.push("---", "", "*Times update when you refresh or toggle.*");

  return blocks.join("\n");
}

export function successToastFromSummary(summary: AttendanceSummary): { title: string; message: string } {
  if (summary.state === "in") {
    return {
      title: "▶  Checked in",
      message: [
        "On the clock",
        `Today ${formatElapsed(summary.todayWorkedMs)} · Session ${formatElapsed(Date.now() - summary.checkIn.getTime())}`,
      ].join("\n"),
    };
  }
  return {
    title: "⏹  Checked out",
    message: ["Off the clock", `Today ${formatElapsed(summary.todayWorkedMs)}`].join("\n"),
  };
}
