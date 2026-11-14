import { weekBlockLayout, type WeekSummary } from "daily-karte";

const colors = {
  sage: "#9CBEAC",
  amber: "#E8C27C",
  rose: "#DFA0AA",
  blue: "#91B7DF",
  lavender: "#B8A4D9",
};

function xml(value: string) {
  return value.replace(
    /[&<>"']/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&apos;",
      })[character]!,
  );
}

function clock(slot: number) {
  return `${String(Math.floor(slot / 2)).padStart(2, "0")}:${slot % 2 ? "30" : "00"}`;
}

export function calendarSVG(summary: WeekSummary, today: string, dark: boolean) {
  const layout = weekBlockLayout(summary.blocks);
  const rows = layout.endSlot - layout.startSlot;
  const rowHeight = Math.min(26, 260 / rows);
  const top = 52;
  const left = 54;
  const columnWidth = 110;
  const height = top + rows * rowHeight + 24;
  const background = dark ? "#242625" : "#F7F8F6";
  const foreground = dark ? "#E4E8E3" : "#343C36";
  const line = dark ? "#454C47" : "#D8DED8";
  const selection = dark ? "#35483D" : "#E4EEE5";
  const parts = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="840" height="${height}" viewBox="0 0 840 ${height}">`,
    `<rect width="840" height="${height}" rx="12" fill="${background}"/>`,
    `<g font-family="-apple-system,Helvetica,Arial,sans-serif" fill="${foreground}">`,
  ];
  for (const [index, column] of layout.columns.entries()) {
    const x = left + index * columnWidth;
    if (column.day === today)
      parts.push(`<rect x="${x}" y="8" width="${columnWidth}" height="${height - 26}" rx="7" fill="${selection}"/>`);
    const date = new Date(`${column.day}T12:00:00`);
    const weekday = date.toLocaleDateString("en", { weekday: "short" });
    parts.push(
      `<text x="${x + columnWidth / 2}" y="28" text-anchor="middle" font-size="15" font-weight="600">${weekday}${column.day === today ? " •" : ""}</text>`,
    );
    parts.push(
      `<text x="${x + columnWidth / 2}" y="45" text-anchor="middle" font-size="13">${date.toLocaleDateString("en", { month: "short", day: "numeric" })}</text>`,
    );
    parts.push(`<path d="M ${x} ${top} V ${height - 24}" stroke="${line}" fill="none"/>`);
    for (const run of column.runs) {
      if (!run.activity) continue;
      const y = top + (run.startSlot - layout.startSlot) * rowHeight;
      const blockHeight = (run.endSlot - run.startSlot) * rowHeight;
      const color = colors[run.activity.color];
      parts.push(
        `<rect x="${x + 3}" y="${y + 1}" width="${columnWidth - 6}" height="${Math.max(3, blockHeight - 2)}" rx="4" fill="${color}"/>`,
      );
      parts.push(
        `<title>${xml(`${run.activity.name}, ${column.day}, ${clock(run.startSlot)} to ${clock(run.endSlot)}`)}</title>`,
      );
      if (blockHeight >= 18) {
        const name = Array.from(run.activity.name);
        const label = name.length > 13 ? `${name.slice(0, 12).join("")}…` : run.activity.name;
        parts.push(`<text x="${x + 8}" y="${y + 13}" font-size="12" fill="#202A24">${xml(label)}</text>`);
      }
    }
    for (let slot = layout.startSlot; slot < layout.endSlot; slot++) {
      const block = summary.blocks[index].slots[slot];
      const y = top + (slot - layout.startSlot + 0.5) * rowHeight;
      if (block.points.length)
        parts.push(`<circle cx="${x + columnWidth - 12}" cy="${y}" r="4" fill="${foreground}"/>`);
      if (block.activities.length > 1)
        parts.push(`<text x="${x + columnWidth - 25}" y="${y + 4}" font-size="12" fill="#202A24">+</text>`);
    }
  }
  for (let slot = layout.startSlot; slot <= layout.endSlot; slot += 2) {
    const y = top + (slot - layout.startSlot) * rowHeight;
    parts.push(`<path d="M ${left} ${y} H 824" stroke="${line}" stroke-opacity="0.65" fill="none"/>`);
    if (rows <= 36 || slot % 4 === 0) parts.push(`<text x="8" y="${y + 4}" font-size="12">${clock(slot)}</text>`);
  }
  parts.push("</g></svg>");
  return parts.join("");
}

export function calendarImage(summary: WeekSummary, today: string, dark: boolean) {
  return `data:image/svg+xml;base64,${Buffer.from(calendarSVG(summary, today, dark)).toString("base64")}`;
}
