import { basename, extname } from "path";
import { statSync } from "fs";
import { ShelfItem } from "./types";

/**
 * Formats a date according to the provided format string
 * Supports: YYYY, YY, MM, M, MMM, MMMM, DD, D, DDD, DDDD (case insensitive)
 * @param format - The format string
 * @param date - Optional date to use (defaults to current date)
 */
function formatDate(format: string, date?: Date): string {
  const dateToUse = date || new Date();
  const year = dateToUse.getFullYear();
  const month = dateToUse.getMonth() + 1;
  const day = dateToUse.getDate();
  const dayOfWeek = dateToUse.getDay();

  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const monthNamesFull = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const dayNamesFull = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  let result = format;

  // Year (case insensitive, order matters - check longer patterns first)
  result = result.replace(/yyyy/gi, String(year));
  result = result.replace(/yy/gi, String(year).slice(-2));

  // Month (case insensitive, order matters - check longer patterns first)
  result = result.replace(/mmmm/gi, monthNamesFull[month - 1]);
  result = result.replace(/mmm/gi, monthNames[month - 1]);
  result = result.replace(/mm/gi, String(month).padStart(2, "0"));
  result = result.replace(/\bm\b/gi, String(month));

  // Day of week and day of month (case insensitive, order matters - check longer patterns first)
  // Replace longest patterns first to avoid partial matches
  result = result.replace(/dddd/gi, dayNamesFull[dayOfWeek]);
  result = result.replace(/ddd/gi, dayNames[dayOfWeek]);
  result = result.replace(/dd/gi, String(day).padStart(2, "0"));
  result = result.replace(/\bd\b/gi, String(day));

  return result;
}

/**
 * Formats a time according to the provided format string
 * Supports: HH, H, mm, ss, A, etc. (case insensitive for mm/ss so MM/SS work)
 * @param format - The format string
 * @param date - Optional date to use (defaults to current time)
 */
function formatTime(format: string, date?: Date): string {
  const dateToUse = date || new Date();
  const hours = dateToUse.getHours();
  const minutes = dateToUse.getMinutes();
  const seconds = dateToUse.getSeconds();

  let result = format;
  result = result.replace(/HH/g, String(hours).padStart(2, "0"));
  result = result.replace(/H/g, String(hours));
  result = result.replace(/mm/gi, String(minutes).padStart(2, "0"));
  result = result.replace(/ss/gi, String(seconds).padStart(2, "0"));
  result = result.replace(/A/g, hours >= 12 ? "PM" : "AM");
  result = result.replace(/hh/g, String(hours % 12 || 12).padStart(2, "0"));
  result = result.replace(/h/g, String(hours % 12 || 12));

  return result;
}

/**
 * Parses a numbering expression like $n$, $nn$, $nnn:10$, $nn-$, etc.
 */
function parseNumberingExpression(expr: string, index: number, total: number): string {
  // Check if descending
  const isDescending = expr.includes("-");
  const exprWithoutDash = expr.replace(/-/g, "");

  // Extract padding from number of 'n' characters
  const nCount = (exprWithoutDash.match(/n/g) || []).length;
  const padding = nCount > 0 ? nCount : 1;

  // Extract start number (default: 1)
  let startNumber = 1;
  const colonIndex = expr.indexOf(":");
  if (colonIndex !== -1) {
    const startStr = expr.substring(colonIndex + 1).replace(/-/g, "");
    const parsed = parseInt(startStr, 10);
    if (!isNaN(parsed)) {
      startNumber = parsed;
    }
  }

  // Calculate number
  let num: number;
  if (isDescending) {
    num = startNumber + (total - 1 - index);
  } else {
    num = startNumber + index;
  }

  // Apply padding
  return String(num).padStart(padding, "0");
}

/**
 * Main expression parser
 * Processes expressions like: $f.e$, $f$, $.e$, $n$, $nnn:10$, $(old):(new)$, $d:YYYY-MM-DD$, etc.
 */
export function parseExpression(
  expression: string,
  item: ShelfItem,
  index: number,
  total: number,
  matchPattern?: string,
): string {
  if (!expression) {
    return item.name;
  }

  const normalizeExpression = (expr: string): string => {
    const dollarCount = (expr.match(/\$/g) || []).length;
    if (dollarCount % 2 === 1) {
      return expr + "$";
    }
    return expr;
  };

  // Start with the current name
  let workingName = item.name;
  const ext = extname(item.name);
  const nameWithoutExt = basename(item.name, ext);
  const normalizedExpression = normalizeExpression(expression);

  // Helper function to process expression and return the result
  const processExpression = (expr: string): string => {
    let result = expr;

    // Get file date if needed
    let fileDate: Date | undefined;
    const needsFileDate = expr.includes("$d:f") || expr.includes("$t:f");
    if (needsFileDate) {
      try {
        const stat = statSync(item.path);
        fileDate = stat.mtime;
      } catch {
        fileDate = undefined;
      }
    }

    // Date: $d$ or $d:format$ or $d:f$ or $d:f:format$
    const dateRegex = /\$d(?::([^$]+))?\$/g;
    result = result.replace(dateRegex, (match, format) => {
      if (format === "f") {
        return formatDate("YYYY-MM-DD", fileDate);
      } else if (format && format.startsWith("f:")) {
        const customFormat = format.substring(2);
        return formatDate(customFormat, fileDate);
      } else if (format) {
        return formatDate(format);
      }
      return formatDate("YYYY-MM-DD");
    });

    // Time: $t$ or $t:format$ or $t:f$ or $t:f:format$
    const timeRegex = /\$t(?::([^$]+))?\$/g;
    result = result.replace(timeRegex, (match, format) => {
      if (format === "f") {
        return formatTime("HH:MM:SS", fileDate);
      } else if (format && format.startsWith("f:")) {
        const customFormat = format.substring(2);
        return formatTime(customFormat, fileDate);
      } else if (format) {
        return formatTime(format);
      }
      return formatTime("HH:MM:SS");
    });

    // Numbering tokens
    const numberingRegex = /\$n+(?:-)?(?::\d+)?\$/g;
    result = result.replace(numberingRegex, (match) => {
      return parseNumberingExpression(match, index, total);
    });

    // Name tokens (use the working name)
    result = result.replace(/\$f\.e\$/g, workingName);
    result = result.replace(/\$f\$/g, nameWithoutExt);
    result = result.replace(/\$\.e\$/g, ext);

    // Remove any remaining legacy find/replace patterns
    result = result.replace(/\$\([^)]*\):\([^)]*\)\$/g, "");

    return result;
  };

  // If matchPattern is provided, apply expression only to matched portions
  if (matchPattern && matchPattern.trim()) {
    // Find all occurrences of the match pattern in the filename
    const matchRegex = new RegExp(matchPattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
    const matches = [...workingName.matchAll(matchRegex)];

    if (matches.length > 0) {
      let result = workingName;
      // Process matches in reverse order to maintain correct indices
      for (let i = matches.length - 1; i >= 0; i--) {
        const matchInfo = matches[i];
        const matchedText = matchInfo[0];
        const matchedStart = matchInfo.index!;
        const matchedEnd = matchedStart + matchedText.length;

        // Apply expression to the matched portion
        const expressionResult = processExpression(normalizedExpression);
        // Replace the matched portion with the expression result
        result = result.slice(0, matchedStart) + expressionResult + result.slice(matchedEnd);
      }
      workingName = result;
    } else {
      // No matches found, return original name
      return item.name;
    }
  } else {
    // No match pattern, apply expression to the whole filename
    workingName = processExpression(normalizedExpression);
  }

  // Remove any remaining literal $ markers.
  workingName = workingName.replace(/\$/g, "");

  // If result is empty after processing, use the original name
  if (!workingName.trim()) {
    workingName = item.name;
  }

  if (ext) {
    // Always preserve the original extension without stripping dotted names.
    if (!workingName.endsWith(ext)) {
      workingName = workingName + ext;
    }
  }

  return workingName;
}
