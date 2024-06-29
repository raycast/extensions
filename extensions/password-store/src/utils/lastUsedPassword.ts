import os from "os";
import fsPromises from "fs/promises";

const LAST_USED_PASSWORD = `${os.homedir()}/.last-used-password.json`;

/**
 * Retrieves the last used password if it was used within the last two minutes.
 *
 * @returns {Promise<{ password: string | null; option: string | null }>} An object containing the password and option, or null values if the password was not used within the last two minutes.
 */
export const getLastUsedPassword = async (): Promise<{ password: string | null; option: string | null }> => {
  try {
    // Read the content of the last used password file
    const lastUsedPasswordFile = await fsPromises.readFile(LAST_USED_PASSWORD, "utf8");

    if (lastUsedPasswordFile) {
      // Parse the JSON content of the file
      const { password, option, timestamp } = JSON.parse(lastUsedPasswordFile);

      // Calculate the difference in seconds between the current time and the timestamp from the file
      const diffSeconds = (Date.now() - Number(timestamp)) / 1000;

      // If the password was used within the last two minutes, return it
      if (diffSeconds < 120) {
        return { password, option };
      }
    }
  } catch (error) {
    // Log any errors that occur during file reading or parsing
    console.error("Error reading the last used password file:", error);
  }

  // If no valid password was found, return null values
  return { password: null, option: null };
};

/**
 * Updates the last used password with the given password and option.
 *
 * @param {string} password - The password to save.
 * @param {string} option - The associated option for the password.
 * @returns {Promise<void>} A promise that resolves when the file has been written.
 */
export const updateLastUsedPassword = async (password: string, option: string): Promise<void> => {
  try {
    // Create a JSON string with the password, option, and current timestamp
    const jsonString = JSON.stringify({
      password,
      option,
      timestamp: Date.now(),
    });

    // Write the JSON string to the file
    await fsPromises.writeFile(LAST_USED_PASSWORD, jsonString);
  } catch (error) {
    // Log any errors that occur during the file write operation
    console.error("Error updating the last used password file:", error);
  }
};
