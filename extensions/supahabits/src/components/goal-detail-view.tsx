import { List } from "@raycast/api";

import { Goal } from "../models/goal";
import { parseISODate, getDaysDifference, formatLongDate } from "../utils/dates";

function renderProgressBar(percentage: number) {
  const filledBars = Math.round(percentage / 10);
  const emptyBars = 10 - filledBars;

  return "``" + "■".repeat(filledBars) + "□".repeat(emptyBars) + "``";
}

function getStatusIcon(status: "active" | "completed" | "upcoming") {
  switch (status) {
    case "active":
      return "🟢 Active";
    case "completed":
      return "🌟 Completed";
    case "upcoming":
      return "⏳ Upcoming";
    default:
      return status;
  }
}

export default function GoalDetailView({ goal }: { goal: Goal }) {
  const dueDate = parseISODate(goal.due_date);
  const createdDate = parseISODate(goal.created_at);
  const daysLeft = getDaysDifference(new Date(), dueDate);

  // Calculate progress percentage based on days left until due date
  // The closer to the due date, the higher the percentage
  let progressPercentage = 5; // Minimum 5%

  if (goal.status === "completed") {
    progressPercentage = 100; // Completed goals are at 100%
  } else if (daysLeft <= 0) {
    progressPercentage = 100; // Due date passed, show full bar
  } else {
    progressPercentage =
      daysLeft > 1
        ? Math.min(95, Math.max(5, 100 - (daysLeft / 30) * 100))
        : Math.min(100, Math.max(5, 100 - daysLeft * 100));
  }

  const progressBar = renderProgressBar(progressPercentage);

  return (
    <List.Item.Detail
      markdown={`
# ${goal.title}

${goal.description ? goal.description : "_No description provided._"}

## Status: ${getStatusIcon(goal.status)}

- **Due Date:** ${formatLongDate(dueDate)}
- **Created:** ${formatLongDate(createdDate)}
${daysLeft > 0 ? `- **Time Remaining:** ${daysLeft} days left` : "- **Due date has passed**"}

## Progress
${progressBar}
${Math.round(progressPercentage)}% Complete
`}
    />
  );
}
