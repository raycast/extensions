import { LocalStorage, closeMainWindow, showHUD } from "@raycast/api";
import { execSync } from "child_process";
import * as os from "os";

import { installDefaultWeights } from "./defaults";

interface ExportArguments {
  destination: string;
}

export default function Main(props: { arguments: ExportArguments }) {
  const { destination } = props.arguments;

  // Install initial data if first time running
  Promise.resolve(LocalStorage.getItem("https://google.com")).then((weight) => {
    if (!weight) {
      installDefaultWeights().then(() => jumpToTarget(destination));
    } else {
      jumpToTarget(destination);
    }
  });
}

function jumpToTarget(destination: string) {
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
  Promise.resolve(getBestMatch(destination)).then((match) => {
    if (match !== undefined && destinationTarget == "") {
      // If not path/URL override, make the jump
      try {
        execSync(`open "${(match as string).trim()}"`);
      } catch (error) {
        Promise.resolve(showHUD("Jump Failed — Jump Point No Longer Valid"));
      }
      closeMainWindow();
      return;
    }

    const fileExtensionExpr =
      /.*\.(png|pdf|tiff|jpg|jpeg|txt|doc|docx|pages|key|keynote|numbers|rtf|tex|csv|ppt|pptx|tar|rar|xml|html|css|js|ts|tsx|jsx|aif|flac|m4a|mp3|ogg|wav|m4v|mov|mp4|obj|bmp|heic|psd|tif|svg|pub|xls|xlsx|db|sql|app|jar||stl|json|php|xhtml|otf|ttf|woff|woff2||icns|zip|gz|dmg|c|py|lua|java|cpp|swift|yml|rust|r|tmp|ics|torrent|md|rst|m|rb|ruby|javascript|scss|less|apl|adb|ada|ads||applescript|scpt|ino|asm|sh|bash|h|cs|csx|c\\+\\+|lisp|pyx|pxd|pxi|dart|diff|dockerfile|mustache|ex|exs|emaxs|erl|f90|f95|for|graphql|groovy|hs|hsc|ini|cfg|prefs|properties|pde|ipynb|kt|ktm|kts|ll|make|mkfile|mk|markdown|mathematica|mt|ma|matlab|pass|pl|perl|ps|red|reds|robot|sparql|sass|scm|zsh|ksh|toml|vb|vbs|vue|plist|gif)/;

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
          Promise.resolve(showHUD("Jump Failed — Destination Not Found"));
          return;
        }
      }
    }

    try {
      // Substitute home directory if necessary, then perform the jump
      if (destinationTarget.startsWith("~")) {
        destinationTarget = os.homedir() + destinationTarget.substring(1);
      }
      execSync(`open "${destinationTarget.trim()}"`);
      Promise.resolve(LocalStorage.getItem(destinationTarget)).then((weight) => {
        if (!weight) {
          Promise.resolve(LocalStorage.setItem(destinationTarget, 1));
        } else {
          Promise.resolve(LocalStorage.setItem(destinationTarget, (weight as number) * 1.1));
        }
      });
      closeMainWindow();
    } catch (error) {
      Promise.resolve(showHUD("Jump Failed — Provide a More Precise Destination"));
    }
  });
}

async function getBestMatch(term: string) {
  // Obtains the best match for the supplied term, accounting for weights
  const items = await LocalStorage.allItems<LocalStorage.Values>();

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
    let numAlike = 0;
    for (const l1 of key) {
      for (const l2 of term) {
        if (l1.toLowerCase() == l2.toLowerCase()) {
          numAlike++;
          break;
        }
      }
      if (numAlike == term.length) {
        break;
      }
    }
    const characterSimilarity = numAlike / term.length;
    const characterDissimilarity = (term.length - numAlike) / term.length;

    // Consecutive Similarity
    let longestMatchLength = 0;
    let currentMatchLength = 0;
    for (const l1 of key) {
      for (const l2 of term.substring(currentMatchLength)) {
        if (l1.toLowerCase() == l2.toLowerCase()) {
          currentMatchLength++;
          longestMatchLength = Math.max(longestMatchLength, currentMatchLength);
          break;
        } else if (l1.toLowerCase() != l2.toLowerCase()) {
          currentMatchLength = Math.max(--currentMatchLength, 0);
        }
      }
    }
    const consecutiveSimilarity = longestMatchLength / term.length;

    // Weighted Total
    const totalWeight =
      (characterSimilarity * 0.2 - characterDissimilarity * 0.5 + consecutiveSimilarity * 0.5) *
      (items[key] / avgBaseWeight);

    if (totalWeight > bestChoiceWeight) {
      bestChoice = key;
      bestChoiceWeight = totalWeight;
      bestChoiceBaseWeight = items[key];
    }
  });

  // Increase the weight of the best candidate entry
  if (bestChoice) {
    Promise.resolve(LocalStorage.setItem(bestChoice as string, bestChoiceBaseWeight * 1.1));
  }

  return bestChoice;
}
