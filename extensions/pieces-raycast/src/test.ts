import testSaveClipboardToPieces from "./test/saveClipboardToPieces";
import testClipboardController from "./test/testClipboardController";

export default async function Command() {
  try {
    await testSaveClipboardToPieces();
    await testClipboardController();
  } catch (e) {
    console.error(e);
  }
}
