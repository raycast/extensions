import { getPreferenceValues, showHUD, Clipboard } from "@raycast/api";

interface Preferences {
  length: string;
  includeNumbers: boolean;
  includeSpecialChars: boolean;
}

function generatePassword(preferences: Preferences): string {
  const passwordLength = parseInt(preferences.length, 10);

  if (isNaN(passwordLength) || passwordLength <= 0) {
    throw new Error("Invalid password length");
  }

  const lowercase = "abcdefghijklmnopqrstuvwxyz";
  const uppercase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const numbers = "0123456789";
  const special = "!@#$%^&*()_+-=[]{}|;:,.<>?";

  let chars = lowercase + uppercase;
  if (preferences.includeNumbers) chars += numbers;
  if (preferences.includeSpecialChars) chars += special;

  // Ensure we have at least one character from each required set
  let password = "";
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += uppercase[Math.floor(Math.random() * uppercase.length)];

  if (preferences.includeNumbers) {
    password += numbers[Math.floor(Math.random() * numbers.length)];
  }

  if (preferences.includeSpecialChars) {
    password += special[Math.floor(Math.random() * special.length)];
  }

  // Fill the rest of the password
  while (password.length < passwordLength) {
    const randomIndex = Math.floor(Math.random() * chars.length);
    password += chars[randomIndex];
  }

  // Shuffle the password to make it more random
  return password
    .split("")
    .sort(() => Math.random() - 0.5)
    .join("");
}

export default async function Command() {
  try {
    const preferences = getPreferenceValues<Preferences>();
    const password = generatePassword(preferences);

    await Clipboard.copy(password);
    await showHUD("Password copied! 🔑");
  } catch (error) {
    console.error("Error generating password:", error);
    await showHUD("Error generating password! ❌");
  }
}
