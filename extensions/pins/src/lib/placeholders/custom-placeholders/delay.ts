import { PLApplicator, Placeholder, PlaceholderCategory, PlaceholderType } from "placeholders-toolkit";
import { scheduleTargetEvaluation } from "../../scheduled-execution";
import PinsPlaceholders from "..";

/**
 * Directive that delays placeholder evaluation of its content by the specified amount of time.
 */
const DelayDirective: Placeholder = {
  name: "delay",
  regex: /{{delay (\d+?)(s|ms|m|h)?:([\s\S]*?)(?=}})/,
  rules: [],
  apply: async (str: string, context?) => {
    const match = str.match(/(?<=delay )(\d+?)(s|ms|m|h)?:([\s\S]*)(?=}})/);
    if (!match) return { result: "" };
    const delay = parseInt(match[1]);
    const unit = match[2] || "s";
    const content = match[3] || "";
    if (!content.length) return { result: "" };
    if (delay <= 0) return { result: "" };

    // Short delay, less than update interval -> just use setTimeout
    if (unit == "s" && delay < 30) {
      await new Promise((resolve) =>
        setTimeout(() => {
          PLApplicator.applyToString(content, { context, allPlaceholders: PinsPlaceholders });
          resolve(true);
        }, delay * 1000),
      );
    }

    // Long delay, more than update interval -> schedule execution to be run on update interval
    else {
      const delayInMinutes =
        unit == "s" ? delay / 60 : unit == "ms" ? delay / 1000 / 60 : unit == "m" ? delay : delay * 60;
      const dueDate = new Date(Date.now() + Math.round(delayInMinutes) * 60000);
      await scheduleTargetEvaluation(content, dueDate);
    }
    return { result: "" };
  },
  constant: false,
  fn: async (duration: string, content: unknown) => {
    if (typeof content === "function") {
      await DelayDirective.apply(`{{delay ${duration}:null}}`);
      return await Promise.resolve(content());
    }
    return (await DelayDirective.apply(`{{delay ${duration}:${content}}}`)).result;
  },
  example: "{{delay 5s:{{alert:Hello!}}}}",
  description:
    "Delays the execution of the script by the specified amount of time. The delay can be specified in seconds (s), milliseconds (ms), minutes (m) or hours (h).",
  hintRepresentation: "{{delay:...}}",
  fullRepresentation: "Delay",
  type: PlaceholderType.InteractiveDirective,
  categories: [PlaceholderCategory.Meta],
};

export default DelayDirective;
