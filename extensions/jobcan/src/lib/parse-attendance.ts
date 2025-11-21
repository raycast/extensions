import { AttendanceResponse, AttendanceEntryRaw, transformAttendanceEntry } from "./types";
import { parse } from "node-html-parser";

/**
 * Known status codes
 */
const KNOWN_STATUS_CODES = new Set(["A", "L", "PV", "SH"]);

/**
 * Parse attendance HTML and extract data
 */
export function parseAttendanceHtml(html: string, year: number, month: number): AttendanceResponse {
  const rawEntries: AttendanceEntryRaw[] = [];

  const root = parse(html);
  const tbody = root.querySelector("tbody");
  if (!tbody) {
    console.debug(`[API] No tbody found in HTML response`);
    return { entries: [], year, month };
  }

  const rows = tbody.querySelectorAll("tr");

  for (const row of rows) {
    const entry = parseAttendanceRow(row, year, month);
    if (entry) {
      rawEntries.push(entry);
    }
  }

  // Transform raw entries to processed entries
  const entries = rawEntries.map(transformAttendanceEntry);

  return { entries, year, month };
}

/**
 * Parse a single attendance table row
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function parseAttendanceRow(row: any, year: number, month: number): AttendanceEntryRaw | null {
  const cells = row.querySelectorAll("td");
  if (cells.length < 11) {
    console.debug(`[API] Row has ${cells.length} cells, expected 11`);
    return null;
  }

  // Check if row has pending status (jbc-table-warning class)
  const isPending = row.classList?.contains("jbc-table-warning") || false;

  // Extract date from first cell
  const dateCell = cells[0];
  const dateLink = dateCell.querySelector("a");
  if (!dateLink) {
    console.debug(`[API] No date link found in first cell, cell HTML: ${dateCell.innerHTML.substring(0, 100)}`);
    return null;
  }

  const dateText = dateLink.text.trim();
  const dateMatch = dateText.match(/(\d{2})\/(\d{2})\(([^)]+)\)/);
  if (!dateMatch) {
    console.debug(`[API] Date text "${dateText}" doesn't match expected pattern`);
    return null;
  }

  const day = parseInt(dateMatch[2], 10);
  const dayOfWeek = dateMatch[3].trim();
  const date = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

  // Extract holiday type from second cell
  const holidayTypeCell = cells[1];
  const holidayType = holidayTypeCell.text.trim() || undefined;

  // Parse cells (based on table structure)
  // Columns: Date, Holiday Type, Shift Time, Clock-in, Clock-out, Working Hours, Off-shift, Overtime, Night Shift, Break, Status
  const shiftTime = cells[2].text.trim() || undefined;
  const clockIn = cells[3].text.trim() || undefined;
  const clockOut = cells[4].text.trim() || undefined;
  const workingHours = cells[5].text.trim() || undefined;
  const offShiftWorkingHours = cells[6].text.trim() || undefined;
  const overtime = cells[7].text.trim() || undefined;
  const nightShift = cells[8].text.trim() || undefined;
  const breakTime = cells[9].text.trim() || undefined;

  // Extract status from last cell
  const statusCell = cells[10];
  const status: string[] = [];
  let statusTooltip: string | undefined;

  // Extract tooltip
  const tooltipDiv = statusCell.querySelector('[data-toggle="tooltip"]');
  if (tooltipDiv) {
    statusTooltip = tooltipDiv.getAttribute("title") || undefined;
  }

  // Look for status font tags: <font style='font-weight: bold;color: ...'>X</font>
  const fontTags = statusCell.querySelectorAll('font[style*="font-weight: bold"]');
  for (const font of fontTags) {
    const statusText = font.text.trim();
    if (statusText) {
      status.push(statusText);
    }
  }

  // Extract status from links (e.g., PV for Paid Vacation)
  const statusLink = statusCell.querySelector("a");
  if (statusLink) {
    const linkFont = statusLink.querySelector("font");
    if (linkFont) {
      const linkStatus = linkFont.text.trim();
      if (linkStatus && !status.includes(linkStatus)) {
        status.push(linkStatus);
      }
    } else {
      // If no font tag, check the link text directly (font tags may have been removed)
      const linkText = statusLink.text.trim();
      // Only add if it looks like a status code (1-3 uppercase letters)
      if (linkText && /^[A-Z]{1,3}$/.test(linkText) && !status.includes(linkText)) {
        status.push(linkText);
      }
    }
  }

  // If no status found in font tags or links, check direct text content of status cell
  // (font tags may have been removed, leaving just the text)
  if (status.length === 0) {
    const cellText = statusCell.text.trim();
    // Extract status codes (1-3 uppercase letters, possibly with whitespace)
    const statusMatches = cellText.match(/\b([A-Z]{1,3})\b/g);
    if (statusMatches) {
      for (const match of statusMatches) {
        const statusCode = match.trim();
        if (statusCode && !status.includes(statusCode)) {
          status.push(statusCode);
        }
      }
    }
  }

  // Detect unrecognized patterns (only log truly unexpected ones, not empty future dates)
  const hasUnrecognizedStatus = status.some((s) => !KNOWN_STATUS_CODES.has(s));
  const isFutureDate = new Date(date) > new Date();
  // Holiday work (holiday with Clock In & Out) is expected, not unexpected
  const isHolidayWork = holidayType && clockIn && clockOut && workingHours;
  const hasUnexpectedData =
    (status.includes("A") && (clockIn || clockOut)) || // Absence but has clock times
    (status.includes("PV") && (clockIn || clockOut)); // Paid vacation but has clock times

  // Only log if it's truly unexpected (not holiday work, not empty future date)
  if ((hasUnrecognizedStatus || (hasUnexpectedData && !isFutureDate)) && !isHolidayWork) {
    console.debug("[API] Unrecognized attendance pattern:", {
      date,
      dayOfWeek,
      holidayType,
      shiftTime,
      clockIn,
      clockOut,
      workingHours,
      status,
      statusTooltip,
      reason: hasUnrecognizedStatus ? "Unknown status code" : "Unexpected data combination",
    });
  }

  return {
    date,
    dayOfWeek,
    holidayType,
    shiftTime,
    clockIn,
    clockOut,
    workingHours,
    offShiftWorkingHours,
    overtime,
    nightShift,
    break: breakTime,
    status: status.length > 0 ? status : [],
    statusTooltip,
    isPending,
  };
}
