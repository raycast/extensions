import testSaveClipboardToPieces from "./test/save-clipboard-test";
import testClipboardController from "./test/clipboard-controller-test";
import testFetchAsset from "./test/fetch-asset-test";
import testAssetsStream from "./test/assets-stream-test";

export default async function Command() {
  try {
    await testSaveClipboardToPieces();
    await testClipboardController();
    await testFetchAsset();
    await testAssetsStream();
  } catch (e) {
    console.error(e);
  }
}
