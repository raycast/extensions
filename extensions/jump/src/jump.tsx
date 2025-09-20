import { LocalStorage, closeMainWindow, showHUD } from "@raycast/api";
import { execSync } from "child_process";
import * as os from "os";

import { getCurrentDirectory, getRunningApplications } from "./utils";

import { installDefaultWeights } from "./defaults";
import { LocalStorageValue } from "./types";

interface ExportArguments {
  destination: string;
}

const fileExtensionExpr =
  /.*\.(png|pdf|tiff|jpg|jpeg|txt|doc|docx|pages|key|keynote|numbers|rtf|tex|csv|ppt|pptx|tar|rar|xml|html|css|js|ts|tsx|jsx|aif|flac|m4a|mp3|ogg|wav|m4v|mov|mp4|obj|bmp|heic|psd|tif|svg|pub|xls|xlsx|db|sql|app|jar||stl|json|php|xhtml|otf|ttf|woff|woff2||icns|zip|gz|dmg|c|py|lua|java|cpp|swift|yml|rust|r|tmp|ics|torrent|md|rst|m|rb|ruby|javascript|scss|less|apl|adb|ada|ads||applescript|scpt|ino|asm|sh|bash|h|cs|csx|c\\+\\+|lisp|pyx|pxd|pxi|dart|diff|dockerfile|mustache|ex|exs|emaxs|erl|f90|f95|for|graphql|groovy|hs|hsc|ini|cfg|prefs|properties|pde|ipynb|kt|ktm|kts|ll|make|mkfile|mk|markdown|mathematica|mt|ma|matlab|pass|pl|perl|ps|red|reds|robot|sparql|sass|scm|zsh|ksh|toml|vb|vbs|vue|plist|gif)/;

export default async function Main(props: { arguments: ExportArguments }) {
  const { destination } = props.arguments;

  // Install initial data if first time running
  const allItems = await LocalStorage.allItems();
  if (Object.keys(allItems).length == 0) {
    console.log("Installing default weights");
    await installDefaultWeights();
  }
  await jumpToTarget(destination);
}

async function jumpToTarget(destination: string) {
  // Determines what, if any, destination to jump to, then performs the jump
  let destinationTarget = "";

  // Exact path/URL overrides existing jump points
  if (destination.startsWith("/") || destination.startsWith("~")) {
    // Destination is a path -- go right to the file
    destinationTarget = destination;
  } else if (destination.startsWith("http")) {
    // Destination is a URL -- go right to it
    destinationTarget = destination;
  }

  // Attempt to find a matching destination among existing jump points
  const match = await getBestMatch(destination);
  if (match !== undefined && destinationTarget == "") {
    // If not path/URL override, make the jump
    closeMainWindow();
    try {
      execSync(`open "${(match as string).trim()}"`);
    } catch (error) {
      await showHUD("Jump Failed — Jump Point No Longer Valid");
    }
    return;
  }

  // Attempt to find an appropriate destination on the system, fallback to forming a URL
  if (destinationTarget == "") {
    if (destination.toLowerCase().match(/[.*\\.]*.*\.(com|net|org|tk|nl|uk|gov|edu|io|xyz|co|us)/)) {
      // Destination is a domain -- create a full URL and go to it
      destinationTarget = `http://${destination}`;
    } else {
      // Destination is not an exact path/URL/domain -- try to find a matching file on disk
      const itemName = destination.split("/").pop()?.replaceAll("`", "\\`");
      destinationTarget = execSync(`mdfind "kMDItemFSName == '*${itemName}*'cdw" | head -1`).toString();

      if (!destinationTarget && !destination.toLowerCase().match(fileExtensionExpr)) {
        // Destination is just a term -- assume it's a website
        destinationTarget = `http://${destination}`;
        if (destination.indexOf(".") == -1) {
          destinationTarget = `${destinationTarget}.com`;
        }
      } else if (!destinationTarget && destination.toLowerCase().match(fileExtensionExpr)) {
        await showHUD("Jump Failed — Destination Not Found");
        return;
      }
    }
  }

  try {
    // Substitute home directory if necessary, then perform the jump
    if (destinationTarget.startsWith("~")) {
      destinationTarget = os.homedir() + destinationTarget.substring(1);
    }

    const weight = await LocalStorage.getItem(destinationTarget);
    if (!weight) {
      await LocalStorage.setItem(destinationTarget, 1);
    } else {
      await LocalStorage.setItem(destinationTarget, (weight as number) * 1.1);
    }

    closeMainWindow();
    execSync(`open "${destinationTarget.trim()}"`);
  } catch (error) {
    await showHUD("Jump Failed — Provide a More Precise Destination");
  }
}

async function getBestMatch(term: string) {
  // Obtains the best match for the supplied term, accounting for weights
  const items = await LocalStorage.allItems<LocalStorageValue>();

  const runningApplications = await getRunningApplications();
  const currentDirectory = await getCurrentDirectory();

  let avgBaseWeight = 0;
  Object.entries(items).forEach(([key]) => {
    avgBaseWeight += items[key];
  });
  avgBaseWeight /= Object.entries(items).length;

  let bestChoice = undefined;
  let bestChoiceWeight = 0.4;
  let bestChoiceBaseWeight = 0;
  Object.entries(items).forEach(([key]) => {
    // Overall Character Similarity
    const intersection = new Set();
    const s1 = new Set(key);
    const s2 = new Set(term);
    for (const elem of s1) {
      if (s2.has(elem)) {
        intersection.add(elem);
      }
    }
    const numAlike = intersection.size;
    const characterSimilarity = numAlike / term.length;
    const characterDissimilarity = (term.length - numAlike) / term.length;

    // Consecutive Similarity
    const l1 = key.length;
    const l2 = term.length;
    const subLengths = Array(l1 + 1)
      .fill(0)
      .map(() => Array(l2 + 1).fill(0));
    let lml1 = 0;
    let lml2 = 0;
    let lml3 = 0;
    for (let i = 0; i <= l1; i++) {
      for (let j = 0; j <= l2; j++) {
        if (i == 0 || j == 0) subLengths[i][j] = 0;
        else if (key[i - 1] == term[j - 1]) {
          subLengths[i][j] = subLengths[i - 1][j - 1] + 1;
          lml3 = lml2;
          lml2 = lml1;
          lml1 = Math.max(lml1, subLengths[i][j]);
        } else subLengths[i][j] = 0;
      }
    }
    const consecutiveSimilarity = lml1 / l2;
    if (lml2 == 0) lml2 = lml1;
    if (lml3 == 0) lml3 = lml2;
    const avgMatchLengthSimilarity = (lml1 + lml2 + lml3) / 3 / l2;

    let regexString = "";
    term.split("").forEach((char) => {
      regexString += (char.match(/([[\])(+*.^$?])/g) ? "\\" : "") + char + ".*";
    });
    const rgx = new RegExp(regexString, "i");
    const regexMatchModifier = key.match(rgx) ? 2 : 1;

    // Weighted Total
    let totalWeight =
      (characterSimilarity * 0.1 -
        characterDissimilarity * 0.3 +
        consecutiveSimilarity * 0.4 +
        avgMatchLengthSimilarity * 0.4) *
      (items[key] / avgBaseWeight) *
      regexMatchModifier;

    // Slightly prefer closed applications
    if (key in runningApplications) {
      totalWeight *= 0.9;
    }

    // Prefer subfolders & files of current directory
    if (key.indexOf(currentDirectory) != -1) {
      totalWeight *= 1.05;
    }

    if (totalWeight > bestChoiceWeight) {
      bestChoice = key;
      bestChoiceWeight = totalWeight;
      bestChoiceBaseWeight = items[key];
    }
  });

  // Increase the weight of the best candidate entry
  if (bestChoice) {
    await LocalStorage.setItem(bestChoice as string, bestChoiceBaseWeight * 1.01);
  }

  return bestChoice;
}
