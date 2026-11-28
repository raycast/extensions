import { getPreferenceValues } from "@raycast/api";
import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

type VisionTextObservation = {
  text: string;
  x: number;
  y: number;
  height: number;
};

type VisionScriptResult = { observations: VisionTextObservation[] } | { unsupportedLanguages: string[] };

/**
 * Runs Apple's Vision framework (the engine behind macOS Live Text) through JavaScript for Automation,
 * so no extra binary or Tesseract install is needed.
 * argv[0] is the image path, argv[1] the comma-separated recognition languages.
 */
const visionScript = `
ObjC.import("Foundation");
ObjC.import("Vision");

function run(argv) {
  const request = $.VNRecognizeTextRequest.alloc.init;
  request.recognitionLevel = $.VNRequestTextRecognitionLevelAccurate;
  request.usesLanguageCorrection = true;

  const requestedLanguages = argv[1].split(",").map((language) => language.trim()).filter(Boolean);
  const supportedLanguages = ObjC.deepUnwrap(request.supportedRecognitionLanguagesAndReturnError($())) || [];
  const unsupportedLanguages = requestedLanguages.filter((language) => !supportedLanguages.includes(language));
  if (unsupportedLanguages.length > 0) {
    return JSON.stringify({ unsupportedLanguages });
  }
  request.recognitionLanguages = $(requestedLanguages);

  const handler = $.VNImageRequestHandler.alloc.initWithURLOptions($.NSURL.fileURLWithPath(argv[0]), $({}));
  const error = $();
  if (!handler.performRequestsError($([request]), error)) {
    throw new Error(error.localizedDescription.js);
  }

  const observations = [];
  const results = request.results;
  for (let index = 0; index < results.count; index++) {
    const observation = results.objectAtIndex(index);
    const box = observation.boundingBox;
    observations.push({
      text: observation.topCandidates(1).objectAtIndex(0).string.js,
      x: box.origin.x,
      y: box.origin.y + box.size.height / 2,
      height: box.size.height,
    });
  }
  return JSON.stringify({ observations });
}
`;

export default async function visionOcr(imagePath: string) {
  const recognitionLanguages = getPreferenceValues<Preferences>().vision_languages || "en-US";
  const { stdout } = await execFileAsync("/usr/bin/osascript", [
    "-l",
    "JavaScript",
    "-e",
    visionScript,
    imagePath,
    recognitionLanguages,
  ]);
  const result: VisionScriptResult = JSON.parse(stdout);

  if ("unsupportedLanguages" in result) {
    throw new Error(
      `Apple Vision on this Mac does not support: ${result.unsupportedLanguages.join(
        ", "
      )}. Change Apple Vision Languages or use Tesseract.`
    );
  }

  return normalizeAllahLigature(joinIntoLines(result.observations));
}

/**
 * Vision returns observations unordered. Sort them top to bottom (its origin is bottom-left),
 * put observations on the same line together, and order each line by its script direction.
 */
function joinIntoLines(observations: VisionTextObservation[]) {
  const lines: VisionTextObservation[][] = [];

  for (const observation of [...observations].sort((first, second) => second.y - first.y)) {
    const lineAnchor = lines[lines.length - 1]?.[0];
    if (lineAnchor && Math.abs(lineAnchor.y - observation.y) < Math.min(lineAnchor.height, observation.height) / 2) {
      lines[lines.length - 1].push(observation);
    } else {
      lines.push([observation]);
    }
  }

  return lines
    .map((line) => {
      const isRightToLeftLine = /[\u0590-\u08FF\uFB1D-\uFDFF\uFE70-\uFEFC]/.test(
        line.map((observation) => observation.text).join("")
      );
      return line
        .sort((first, second) => (isRightToLeftLine ? second.x - first.x : first.x - second.x))
        .map((observation) => observation.text)
        .join(" ");
    })
    .join("\n");
}

/**
 * Vision decomposes the ligature of the Arabic word Allah into lam-lam + shadda + superscript alef,
 * which breaks searching and pasting. Turn it back into the plain spelling.
 */
function normalizeAllahLigature(text: string) {
  return text.replace(/\u0644\u0644\u0651?\u0670\u0647/g, "\u0644\u0644\u0647");
}
