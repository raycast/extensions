import vision from "@google-cloud/vision";
import { recognize } from "node-tesseract-ocr";
import { getPreferenceValues } from "@raycast/api";

async function tesseractOcr(imagePath: string) {
  const config = {
    lang: "eng",
    oem: 1,
    psm: 3,
    binary: getPreferenceValues<Preferences>().tesseract_path,
  };

  return await recognize(imagePath, config);
}

async function googleCloudVision(filePath: string) {
  const { private_key, client_email } = getPreferenceValues();

  const config = {
    credentials: { private_key: private_key.split(String.raw`\n`).join("\n"), client_email },
  };

  const client = new vision.ImageAnnotatorClient(config);

  const [result] = await client.textDetection(filePath);
  const detections: any = result.textAnnotations;

  if (detections[0]) {
    return detections[0].description;
  }

  return false;
}

const ocr = {
  tesseractOcr,
  googleCloudVision,
};
export default ocr;
