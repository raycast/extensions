// The extension against FF-1280's shipped contract: the dictionary
// (MomentMac/Moment.sdef) and the error numbers (ScriptTimerError.swift).
// Runs only inside Moment's repo; in raycast/extensions the files aren't there.
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { ACTIONS } from "./lines.ts";
import { MINUTES_ADDED_BY_DEFAULT } from "./minutes.ts";
import { EVENT_CODES, RECORD_PROPERTY_CODES, takesMinutes } from "./scripts.ts";
import { COMMAND_TITLES, COMMANDS, MOMENT_BUNDLE_IDS, MOMENT_ERROR, SYSTEM_ERROR, type Command } from "./timer.ts";

// `npm test` runs from the extension's root. (No import.meta: tsconfig's module is commonjs.)
const REPO = join(process.cwd(), "..");
const SDEF = join(REPO, "MomentMac", "Moment.sdef");
const ERRORS = join(REPO, "MomentCore", "Sources", "MomentCore", "Types", "ScriptTimerError.swift");
const LINKS = join(REPO, "MomentCore", "Sources", "MomentCore", "Types", "AppStoreLinks.swift");
const SHORTCUTS = join(REPO, "Moment", "Intents", "StartTimer.swift");
const PROJECT = join(REPO, "Moment.xcodeproj", "project.pbxproj");
const SCRIPT_COMMANDS = join(REPO, "MomentCore", "Sources", "MomentCore", "Services", "ScriptTimerCommands.swift");
const outsideMoment = [SDEF, ERRORS, LINKS, SHORTCUTS, PROJECT, SCRIPT_COMMANDS].some((path) => !existsSync(path));

const TERMS: Record<Command, string> = {
  startFocus: "start focus",
  pauseTimer: "pause timer",
  resumeTimer: "resume timer",
  addTime: "add time",
  stopTimer: "stop timer",
  checkTimer: "check timer",
};

/** Each `<command>` element of the sdef, from its opening tag to its closing one. */
function sdefCommand(sdef: string, term: string): string | undefined {
  const start = sdef.indexOf(`<command name="${term}"`);
  if (start < 0) return undefined;
  return sdef.slice(start, sdef.indexOf("</command>", start));
}

for (const command of COMMANDS) {
  test(`contract_${command}_isTheDictionarysEventCode`, { skip: outsideMoment }, () => {
    const element = sdefCommand(readFileSync(SDEF, "utf8"), TERMS[command]);
    assert.ok(element, TERMS[command]);
    assert.ok(element.includes(`code="${EVENT_CODES[command]}"`), element);
  });

  test(`contract_${command}_takesADirectParameterOnlyWhenTheDictionaryDoes`, { skip: outsideMoment }, () => {
    const element = sdefCommand(readFileSync(SDEF, "utf8"), TERMS[command]) ?? "";
    assert.equal(element.includes("<direct-parameter"), takesMinutes(command));
  });
}

test("contract_timerInfo_propertiesAreTheDictionarysInItsOrder", { skip: outsideMoment }, () => {
  const sdef = readFileSync(SDEF, "utf8");
  const record = sdef.slice(sdef.indexOf('<record-type name="timer info"'), sdef.indexOf("</record-type>"));
  const codes = [...record.matchAll(/<property name="[^"]+" code="([^"]+)"/g)].map((match) => match[1]);
  assert.deepEqual(codes, [...RECORD_PROPERTY_CODES]);
});

for (const [name, number] of Object.entries({ ...MOMENT_ERROR, eventNotHandled: SYSTEM_ERROR.eventNotHandled })) {
  const swiftCase = name === "eventNotHandled" ? "unknownCommand" : name;
  test(`contract_${name}_isScriptTimerErrorsNumber${number}`, { skip: outsideMoment }, () => {
    const swift = readFileSync(ERRORS, "utf8");
    assert.match(swift, new RegExp(`case \\.${swiftCase}\\b[^\\n]*: ${number}\\b`));
  });
}

test("contract_appStoreAction_isAppStoreLinksListing", { skip: outsideMoment }, () => {
  const swift = readFileSync(LINKS, "utf8");
  const appID = /appID = "(\d+)"/.exec(swift)?.[1];
  const listing = /listing = URL\(string: "([^"]+)"\)/.exec(swift)?.[1];
  assert.ok(appID && listing);
  assert.equal(ACTIONS.openAppStore.url, listing.replace("\\(appID)", appID));
});

for (const command of COMMANDS) {
  test(`contract_${command}_isTitledAsSirisShortcut`, { skip: outsideMoment }, () => {
    assert.ok(
      readFileSync(SHORTCUTS, "utf8").includes(`shortTitle: "${COMMAND_TITLES[command]}"`),
      COMMAND_TITLES[command],
    );
  });
}

// The Mac app's builds: the App Store's, and Setapp's (FF-1309), whose id Setapp requires to end in -setapp.
for (const bundleId of MOMENT_BUNDLE_IDS) {
  test(`contract_${bundleId}_isABundleIdTheProjectBuilds`, { skip: outsideMoment }, () => {
    const setting = new RegExp(`PRODUCT_BUNDLE_IDENTIFIER = "?${bundleId.replaceAll(".", "\\.")}"?;`);
    assert.match(readFileSync(PROJECT, "utf8"), setting);
  });
}

// FF-1318: Add Time's confirmation says how much Moment adds without minutes.
test("contract_minutesAddedByDefault_isWhatMomentAddsWithoutMinutes", { skip: outsideMoment }, () => {
  const swift = readFileSync(SCRIPT_COMMANDS, "utf8");
  assert.match(swift, new RegExp(`static let defaultMinutesToAdd = ${MINUTES_ADDED_BY_DEFAULT}\\n`));
});
