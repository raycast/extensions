// Function to convert alphabetic characters to their numeric equivalents
function convertAlphaToNumeric(input: string): string {
  return input.toUpperCase().replace(/[A-Z]/g, (char) => {
    const code = char.charCodeAt(0);
    if (code < 80) return String(Math.floor((code - 65) / 3) + 2);
    if (code < 87) return String(Math.floor((code - 66) / 3) + 2);
    return "9";
  });
}

// Function to clean the phone number
export function cleanPhoneNumber(input: string): string {
  // Convert alpha to numeric, then remove all non-digit characters except '+'
  return convertAlphaToNumeric(input).replace(/[^\d+]/g, "");
}

// Function to validate the phone number
export function isValidPhoneNumber(input: string): boolean {
  const cleaned = cleanPhoneNumber(input);

  // Regex for international numbers (including alphanumeric)
  const phoneRegex = /^(\+\d{1,3})?(\d{10,14})$/;

  return phoneRegex.test(cleaned);
}
