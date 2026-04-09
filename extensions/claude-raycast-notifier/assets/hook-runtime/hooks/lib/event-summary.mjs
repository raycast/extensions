export function eventSummary(source, type) {
  const subject = source ? capitalize(source) : "AI";
  if (type === "needs_input") return `${subject} Needs Input`;
  if (type === "done") return `${subject} Done`;
  return `${subject} ${capitalize(type ?? "event")}`;
}

export function compactEvent(event) {
  const summary = eventSummary(event?.source, event?.type);
  return {
    ...event,
    title: summary,
    message: summary,
  };
}

function capitalize(value) {
  const normalized = String(value ?? "");
  if (!normalized) return "AI";
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}
