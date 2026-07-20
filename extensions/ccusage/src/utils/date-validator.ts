/**
 * Validates date string in YYYYMMDD format
 * @param date - Date string to validate
 * @param fieldName - Field name for error message (e.g., "since", "until")
 * @throws Error if date format is invalid
 */
export const validateDateFormat = (date: string, fieldName: string): void => {
  if (!/^\d{8}$/.test(date)) {
    throw new Error(`${fieldName} date must be in YYYYMMDD format`);
  }
};
