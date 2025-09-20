import { runAppleScript, showFailureToast } from "@raycast/utils";
import { AtomicShortcut } from "../model/internal/internal-models";
import { KeyCodes } from "../load/key-codes-provider";

// language=JavaScript
const appleScript = `
  // noinspection JSUnresolvedReference,JSUnusedLocalSymbols

  function run(argv) {
    const app = Application.currentApplication();
    app.includeStandardAdditions = true;

    let currentIndex = 0;
    const targetBundleID = argv[currentIndex++];
    const delayArg = parseFloat(argv[currentIndex++]);

    // Activate the target application if targetBundleID is present
    const systemEvents = Application("System Events");
    if (targetBundleID && 
        systemEvents.applicationProcesses.whose({ bundleIdentifier: targetBundleID }).length > 0) {
      app.doShellScript("open -b " + targetBundleID);
      delay(delayArg); // Adjust the delay as needed for the app to activate
    }

    const numberOfChords = parseInt(argv[currentIndex++]);
    for (let i = 0; i < numberOfChords; i++) {
      // Trigger the shortcut
      const numberOfModifiersForChord = parseInt(argv[currentIndex++]);
      const modifiers = [];
      for (let j = 0; j < numberOfModifiersForChord; j++) {
        modifiers.push(argv[currentIndex++]);
      }
      systemEvents.keyCode(parseInt(argv[currentIndex++]), {
        using: modifiers,
      });
    }
  }
`;

export async function runShortcuts(
  bundleId: string | undefined,
  delay: number,
  sequence: AtomicShortcut[],
  keyCodes: KeyCodes
) {
  console.log(`Running shortcut for application ${bundleId} with delay ${delay}`);
  try {
    await runAppleScript(appleScript, generateArguments(bundleId, delay, sequence, keyCodes), {
      language: "JavaScript",
    });
  } catch (error) {
    await showFailureToast(error, { title: "Couldn't run shortcut" });
    return;
  }
}

/**
 * Format:
 * bundleId
 * delay
 * N - number of chords in sequence
 * M1 - number of modifiers for chord 1
 * modifier 1
 * ...
 * modifier M1
 * base key for chord 1
 * ...
 * MN - number of modifiers for chord N
 * modifier 1
 * ...
 * modifier MN
 * base key for chord N
 *
 * Note: non-existing bundleId will be replaced as an empty string
 */
function generateArguments(
  bundleId: string | undefined,
  delay: number,
  sequence: AtomicShortcut[],
  keyCodes: KeyCodes
): string[] {
  const args: string[] = [bundleId ?? "", String(delay), String(sequence.length)];
  sequence.forEach((atomic) => {
    args.push(String(atomic.modifiers.length));
    args.push(...atomic.modifiers);
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    args.push(keyCodes.get(atomic.base)!);
  });
  return args;
}
