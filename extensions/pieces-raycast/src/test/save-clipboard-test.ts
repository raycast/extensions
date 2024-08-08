import { expect } from "chai";
import { Clipboard } from "@raycast/api";
import saveClipboardToPieces from "../save-clipboard-to-pieces";
import ConnectorSingleton from "../connection/ConnectorSingleton";
import logTestResult from "./utils/logResult";

export default async function testSaveClipboardToPieces() {
  await Clipboard.copy("hello world");

  const asset = await saveClipboardToPieces();

  expect(typeof asset?.id).to.equal("string");

  if (!asset) {
    throw new Error("there was not an asset that got saved");
  }

  const newAssetWithTransferables =
    await ConnectorSingleton.getInstance().assetApi.assetSnapshot({
      asset: asset.id,
      transferables: true,
    });

  await ConnectorSingleton.getInstance().assetsApi.assetsDeleteAsset({
    asset: newAssetWithTransferables.id,
  });

  expect(
    newAssetWithTransferables.formats.iterable.some((el) => {
      return (
        el.fragment?.string?.raw === "hello world" ||
        el.file?.string?.raw === "hello world"
      );
    }),
  ).to.be.true;

  logTestResult("save clipboard");
}
