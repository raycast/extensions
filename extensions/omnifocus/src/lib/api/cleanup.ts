import { executeScript } from "../utils/executeScript";

export async function cleanupPerspective() {
  const result = await executeScript<boolean>(`
    try {
      const omnifocus = Application('OmniFocus');
      omnifocus.evaluateJavascript('cleanUp()');
      return true;
    } catch (err) {
      return false;
    }
  `);

  if (!result) {
    throw new Error("Failed to clean up the perspective");
  }

  return true;
}
