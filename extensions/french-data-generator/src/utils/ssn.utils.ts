// Generate a random SSN based on gender, date of birth, and minor/adult status
export function generateRandomSSN(dob?: string, gender?: "male" | "female", isMinor?: boolean): string {
  // Parse the date of birth if provided
  let year: string | undefined;
  let month: string | undefined;

  if (dob) {
    const parts = dob.split("/");
    if (parts.length === 3) {
      const parsedYear = parseInt(parts[2], 10);
      const parsedMonth = parseInt(parts[1], 10);

      if (!isNaN(parsedYear) && !isNaN(parsedMonth)) {
        year = (parsedYear % 100).toString().padStart(2, "0"); // Extract last two digits of the year
        month = parsedMonth.toString().padStart(2, "0"); // Extract the month
      }
    }
  }

  // Fallback to a default date if DOB is not valid
  if (!year || !month) {
    const currentYear = new Date().getFullYear();
    const maxYear = isMinor ? currentYear : currentYear - 18;
    const minYear = isMinor ? currentYear - 18 : maxYear - 81;

    const randomYear = Math.floor(Math.random() * (maxYear - minYear + 1)) + minYear;
    year = (randomYear % 100).toString().padStart(2, "0");
    month = Math.floor(Math.random() * 12 + 1)
      .toString()
      .padStart(2, "0");
  }

  // Generate random values for department, commune, and order
  const department = Math.floor(Math.random() * 95 + 1)
    .toString()
    .padStart(2, "0"); // Département code (01-95)
  const commune = Math.floor(Math.random() * 999 + 1)
    .toString()
    .padStart(3, "0"); // Commune code (001-999)
  const order = Math.floor(Math.random() * 999 + 1)
    .toString()
    .padStart(3, "0"); // Order number (001-999)

  const prefix = gender === "male" ? "1" : "2";
  const baseSSN = `${prefix}${year}${month}${department}${commune}${order}`;
  const key = (97 - (parseInt(baseSSN, 10) % 97)).toString().padStart(2, "0");

  return `${baseSSN}${key}`;
}
