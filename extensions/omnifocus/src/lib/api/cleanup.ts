import { executeScript } from "../utils/executeScript";

export async function cleanupPerspective() {
  console.log("Starting cleanup operation");

  try {
    const result = await executeScript<boolean>(`
      try {
        const omnifocus = Application('OmniFocus');
        omnifocus.evaluateJavascript('cleanUp()');
        return true;
      } catch (err) {
        return false;
      }
    `);

    console.log("Cleanup result:", result);

    if (!result) {
      throw new Error("Failed to clean up the perspective");
    }

    return true;
  } catch (err) {
    console.error("Cleanup operation failed:", err);
    throw err;
  }
}
