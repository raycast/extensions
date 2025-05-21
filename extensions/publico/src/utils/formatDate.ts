/**
 * Formats a date string from the API to a more readable format
 * @param dateStr The date string from the API (format varies)
 * @returns Formatted date string in 'DD Month YYYY, HH:MM' format
 */
export function formatDate(dateStr: string): string {
  try {
    // Handle both date formats from the API
    const date = new Date(dateStr);

    // Check if date is valid
    if (isNaN(date.getTime())) {
      return dateStr; // Return the original string if parsing fails
    }

    // Format the date in Portuguese
    const options: Intl.DateTimeFormatOptions = {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    };

    return date.toLocaleDateString("pt-PT", options).replace(",", ",");
  } catch (error) {
    console.error("Error formatting date:", error);
    return dateStr; // Return the original string if an error occurs
  }
}
