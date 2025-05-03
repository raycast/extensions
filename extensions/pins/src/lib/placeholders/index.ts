import { DefaultPlaceholders, Placeholder, PlaceholderType, utils } from "placeholders-toolkit";
import DelayDirective from "./custom-placeholders/delay";
import InputDirective from "./custom-placeholders/input";
import LocationPlaceholder from "./custom-placeholders/location";
import LatitudePlaceholder from "./custom-placeholders/latitude";
import LongitudePlaceholder from "./custom-placeholders/longitude";
import StreetAddressPlaceholder from "./custom-placeholders/address";
import PreviousApplicationPlaceholder from "./custom-placeholders/previousApplication";
import PreviousPinNamePlaceholder from "./custom-placeholders/previousPinName";
import PreviousPinTargetPlaceholder from "./custom-placeholders/previousPinTarget";
import AskAIDirective from "./custom-placeholders/askAI";
import GroupsPlaceholder from "./custom-placeholders/groups";
import GroupNamesPlaceholder from "./custom-placeholders/groupNames";
import PinsPlaceholder from "./custom-placeholders/pins";
import PinTargetsPlaceholder from "./custom-placeholders/pinTargets";
import PinNamesPlaceholder from "./custom-placeholders/pinNames";
import { JavaScriptPlaceholder } from "placeholders-toolkit/dist/lib/defaultPlaceholders";
import vm from "vm";
import * as fs from "fs";
import * as os from "os";
import path from "path";
import * as crypto from "crypto";
import PinStatisticsPlaceholder from "./custom-placeholders/pinStatistics";
import LaunchPinDirective from "./custom-placeholders/launchPin";
import LaunchGroupDirective from "./custom-placeholders/launchGroup";
import CreatePinDirective from "./custom-placeholders/createPin";
import DeletePinDirective from "./custom-placeholders/deletePin";
import MovePinDirective from "./custom-placeholders/movePin";
import PinNamePlaceholder from "./custom-placeholders/pinName";
import PinTargetPlaceholder from "./custom-placeholders/pinTarget";

const filteredPlaceholders = Object.values(DefaultPlaceholders).filter((p) => !["location", "js"].includes(p.name));

// Remove rules from selectedText placeholder to avoid alert sounds
const selectedTextPlaceholder = filteredPlaceholders.find((p) => p.name == "selectedText") as Placeholder;
selectedTextPlaceholder.rules = [];

const PinsPlaceholders = [
  DelayDirective,
  ...filteredPlaceholders.filter((p) => p.type == PlaceholderType.Informational && p.name != "selectedText"),
  selectedTextPlaceholder,
  ...filteredPlaceholders.filter((p) => p.type == PlaceholderType.StaticDirective),
  LocationPlaceholder,
  LatitudePlaceholder,
  LongitudePlaceholder,
  StreetAddressPlaceholder,
  PreviousApplicationPlaceholder,
  PreviousPinNamePlaceholder,
  PreviousPinTargetPlaceholder,
  PinNamePlaceholder,
  PinTargetPlaceholder,
  PinNamesPlaceholder,
  PinTargetsPlaceholder,
  PinsPlaceholder,
  PinStatisticsPlaceholder,
  GroupNamesPlaceholder,
  GroupsPlaceholder,
  AskAIDirective,
  InputDirective,
  LaunchPinDirective,
  LaunchGroupDirective,
  CreatePinDirective,
  MovePinDirective,
  DeletePinDirective,
  ...filteredPlaceholders.filter((p) => p.type == PlaceholderType.InteractiveDirective),
  ...filteredPlaceholders.filter((p) => p.type == PlaceholderType.Custom),
  ...filteredPlaceholders.filter((p) => p.type == PlaceholderType.Script),
];

JavaScriptPlaceholder.apply = async (str: string, context?: { [key: string]: unknown }) => {
  try {
    const script = str.match(/(?<=(js|JS))( target="(.*?)")?:(([^{]|{(?!{)|{{[\s\S]*?}})*?)}}/)?.[4];
    const target = str.match(/(?<=(js|JS))( target="(.*?)")?:(([^{]|{(?!{)|{{[\s\S]*?}})*?)}}/)?.[3];
    if (!script) return { result: "", js: "" };

    if (target) {
      // Run in active browser tab
      const res = await utils.runJSInActiveTab(script.replaceAll(/(\n|\r|\t|\\|")/g, "\\$1"), target);
      return { result: res, js: res };
    }

    // Run in sandbox
    const placeholderFunctions = PinsPlaceholders.reduce(
      (acc, placeholder) => {
        // acc[placeholder.name] = placeholder.fn;
        acc[placeholder.name] = async (...args: never[]) => {
          return placeholder.fn(...args, context as unknown as string);
        };
        return acc;
      },
      {} as { [key: string]: unknown | ((...args: never[]) => Promise<string>) },
    );

    const sandbox = {
      ...placeholderFunctions,
      context,
      fs: fs,
      os: os,
      path: path,
      URL: URL,
      crypto: crypto,
      console: console,

      /**
       * @deprecated Use `console.log` instead.
       */
      log: async (str: string) => {
        console.warn("`log` is deprecated. Use `console.log` instead.");
        console.log(str); // Make logging available to JS scripts
        return "";
      },
    };

    const res = await vm.runInNewContext(script, sandbox, {
      timeout: 1000,
      displayErrors: true,
    });
    return { result: res, js: res };
  } catch (e) {
    return { result: "", js: "" };
  }
};

PinsPlaceholders.push(JavaScriptPlaceholder);

const PinsInfoPlaceholders = PinsPlaceholders.filter((p) => p.type == PlaceholderType.Informational);

export default PinsPlaceholders;
export { PinsInfoPlaceholders };
