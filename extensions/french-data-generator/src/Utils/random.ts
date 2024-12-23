import { bankDetails } from "../data/bank";
import { lastNamesDatabase } from "../data/lastNames";
import { namesDatabase } from "../data/names";

// Random generation of names with gender
export function getRandomName(): { name: string; gender: "male" | "female" } {
  const gender = Math.random() < 0.5 ? "male" : "female"; // Equal probability for male/female
  const firstNames = namesDatabase[gender];

  const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
  const lastName = lastNamesDatabase[Math.floor(Math.random() * lastNamesDatabase.length)];
  return { name: `${firstName} ${lastName}`, gender };
}

// Generate a random date of birth based on minor/adult
export function generateRandomDOB(isMinor: boolean): string {
  const currentYear = new Date().getFullYear();
  const minYear = isMinor ? currentYear - 18 : currentYear - 99;
  const maxYear = isMinor ? currentYear : currentYear - 18;

  const year = Math.floor(Math.random() * (maxYear - minYear + 1)) + minYear;
  const month = Math.floor(Math.random() * 12) + 1;
  const day = Math.floor(Math.random() * 28) + 1;

  return `${day.toString().padStart(2, "0")}/${month.toString().padStart(2, "0")}/${year}`;
}

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

  // Determine prefix based on gender
  const prefix = gender === "male" ? "1" : "2";

  // Construct the base SSN
  const baseSSN = `${prefix}${year}${month}${department}${commune}${order}`;

  // Calculate the key
  const key = (97 - (parseInt(baseSSN, 10) % 97)).toString().padStart(2, "0");

  // Combine the base SSN and key
  return `${baseSSN}${key}`;
}

// Random generation of IBAN and BIC
export function getRandomBankDetails() {
  const randomIndex = Math.floor(Math.random() * bankDetails.length);
  return bankDetails[randomIndex];
}
