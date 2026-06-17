import { expect } from "chai";
import fetchAsset from "../connection/assets/fetchAsset";
import ConnectorSingleton from "../connection/ConnectorSingleton";
import AssetUtil from "../utils/AssetUtil";
import logTestResult from "./utils/logResult";

export default async function testFetchAsset() {
  const indicies =
    await ConnectorSingleton.getInstance().assetsApi.assetsIdentifiersSnapshot();

  const id = indicies.iterable?.[0].id;

  if (!id) throw new Error("didn't get id from identifiers snapshot");

  const strippedAsset = await fetchAsset(id);

  const asset = AssetUtil.stripAsset(
    await ConnectorSingleton.getInstance().assetApi.assetSnapshot({
      asset: id,
      transferables: true,
    }),
  );

  expect(JSON.stringify(asset)).to.eq(JSON.stringify(strippedAsset));
  expect(asset.text).to.not.be.eq(null);

  logTestResult("fetch asset");
}
