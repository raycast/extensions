import { expect } from "chai";
import ConnectorSingleton from "../connection/ConnectorSingleton";
import AssetsController from "../controllers/AssetsController";
import { StrippedAsset } from "../types/strippedAsset";
import { saveTextToPieces } from "../actions/saveAsset";
import { AnnotationTypeEnum } from "@pieces.app/pieces-os-client";
import sleep from "../utils/sleep";
import logTestResult from "./utils/logResult";

export default async function testAssetsStream() {
  let assets: StrippedAsset[] = [];
  const unsubscribe = AssetsController.getInstance().controller.listen(
    (data) => {
      assets = data.assets;
    },
  );

  const identifiers =
    await ConnectorSingleton.getInstance().assetsApi.assetsIdentifiersSnapshot();

  await sleep(500); // wait for assets to populate

  expect(assets.length).to.be.eq(
    identifiers.iterable?.length,
    "Number of assets from controller is not equal to the number of assets from the identifiers snapshot",
  );

  const asset = await saveTextToPieces('console.log("hello world")');
  await sleep(300);

  expect(assets.length).to.eq(
    (identifiers.iterable?.length ?? Infinity) + 1,
    "There is not an extra asset after saving",
  );
  expect(assets.some((el) => el.id === asset?.id)).to.eq(
    true,
    "There is not an asset from the controller with the expected ID",
  );

  await ConnectorSingleton.getInstance().annotationsApi.annotationsCreateNewAnnotation(
    {
      seededAnnotation: {
        text: "hello world",
        asset: asset?.id,
        type: AnnotationTypeEnum.Description,
      },
    },
  );
  await sleep(300);

  const strippedAsset = assets.find((el) => el.id === asset?.id);
  expect(
    strippedAsset?.annotations?.some((el) => el.text === "hello world"),
  ).to.eq(
    true,
    "The newly created annotation is not a part of the asset from the controller",
  );

  logTestResult("assets stream");
  unsubscribe();
}
