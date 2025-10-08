import fs from "node:fs";
import path from "node:path";
import { captureException, environment } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { CaptureSchema } from "../schemas";

export default async function tool(): Promise<Record<string, unknown>[]> {
  const capturesPath = path.join(environment.supportPath, "captures.json");

  if (!fs.existsSync(capturesPath)) {
    return [];
  }

  try {
    const fileContent = fs.readFileSync(capturesPath, "utf-8");
    const rawData = JSON.parse(fileContent);

    if (!Array.isArray(rawData)) {
      captureException(new Error("Captures data is not an array"));
      return [];
    }

    const captures = rawData
      .map((item) => {
        try {
          return CaptureSchema.parse(item);
        } catch (error) {
          captureException(error);
          return null;
        }
      })
      .filter((capture): capture is NonNullable<typeof capture> => capture !== null);

    return captures.map((capture) => ({
      createdAt: capture.createdAt,
      imagePath: capture.imagePath,
      title: capture.title,
      stackName: capture.stackName,
      data: capture.data,
    }));
  } catch (error) {
    showFailureToast({
      title: "Failed to fetch captures",
      message: String(error),
    });
    return [];
  }
}
