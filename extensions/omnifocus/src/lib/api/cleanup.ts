import { executeScript } from "../utils/executeScript";

export async function cleanupPerspective() {
  console.log("Starting cleanup operation");

  try {
    const result = await executeScript<string>(`
      try {
        const omnifocus = Application('com.omnigroup.OmniFocus4');
        omnifocus.evaluateJavascript('cleanUp()');

        return JSON.stringify({
          success: true,
          message: "Cleanup completed successfully"
        });
      } catch (err) {
        return JSON.stringify({
          success: false,
          error: "Operation failed: " + String(err)
        });
      }
    `);

    console.log("Cleanup result:", result);

    const parsedResult = JSON.parse(result);

    if (!parsedResult.success) {
      throw new Error(parsedResult.error || "Failed to clean up the perspective");
    }

    return true;
  } catch (err) {
    console.error("Cleanup operation failed:", err);
    throw err;
  }
}
