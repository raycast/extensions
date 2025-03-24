import { Employee } from "./off-today";

/**
 * Format ISO date string to a more readable format
 */
export function formatDate(dateString: string | Date): string {
  const date = typeof dateString === "string" ? new Date(dateString) : dateString;
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/**
 * Format date as a simple date key (e.g., "Mar 20, 2025")
 */
export function formatDateKey(dateString: string | Date): string {
  const date = typeof dateString === "string" ? new Date(dateString) : dateString;
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * Check if a date is within a range (inclusive)
 */
export function isDateInRange(dateToCheck: string | Date, startDate: string | Date, endDate: string | Date): boolean {
  const checkDate = new Date(dateToCheck);
  const start = new Date(startDate);
  const end = new Date(endDate);

  // Reset time components for accurate date comparison
  checkDate.setHours(0, 0, 0, 0);
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);

  return checkDate >= start && checkDate <= end;
}

/**
 * Group employees by start date
 */
export function groupByDate(employees: Employee[]): Record<string, Employee[]> {
  const grouped: Record<string, Employee[]> = {};

  employees.forEach((employee) => {
    const dateKey = formatDateKey(employee.startDate);

    if (!grouped[dateKey]) {
      grouped[dateKey] = [];
    }

    grouped[dateKey].push(employee);
  });

  return grouped;
}
