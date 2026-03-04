export type RenameRule =
  | { id: string; type: "replace"; options: ReplaceOptions }
  | { id: string; type: "case"; options: CaseOptions }
  | { id: string; type: "add"; options: AddOptions }
  | { id: string; type: "number"; options: NumberOptions }
  | { id: string; type: "extension"; options: ExtensionOptions }
  | { id: string; type: "trim"; options: object };

export interface ReplaceOptions {
  find: string;
  replace: string;
  isRegex: boolean;
  caseSensitive: boolean;
}

export interface CaseOptions {
  format: "lowercase" | "uppercase" | "capitalize" | "titlecase";
}

export interface AddOptions {
  text: string;
  position: "start" | "end";
}

export interface NumberOptions {
  start: number;
  step: number;
  padding: number;
  separator: string;
  position: "start" | "end";
}

export interface ExtensionOptions {
  mode: "lowercase" | "uppercase" | "remove" | "replace";
  newExt?: string;
}

export type RuleType = RenameRule["type"];

export interface FileItem {
  originalPath: string;
  name: string;
  extension: string;
  isDirectory: boolean;
  newName?: string;
  error?: string;
}

// Refactored to handle extension changes
export const applyRulesToItem = (
  item: FileItem,
  rules: RenameRule[],
  index: number,
): { name: string; extension: string } => {
  let currentName = item.name;
  let currentExt = item.extension;

  for (const rule of rules) {
    try {
      if (rule.type === "extension") {
        const options = rule.options;
        if (options.mode === "lowercase") currentExt = currentExt.toLowerCase();
        if (options.mode === "uppercase") currentExt = currentExt.toUpperCase();
        if (options.mode === "remove") currentExt = "";
        if (options.mode === "replace" && options.newExt) {
          currentExt = options.newExt.startsWith(".") ? options.newExt : `.${options.newExt}`;
        }
        continue;
      }

      // Other rules apply to the name part
      switch (rule.type) {
        case "replace": {
          const options = rule.options;
          if (options.find) {
            if (!options.isRegex) {
              const esc = options.find.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
              const flags = options.caseSensitive ? "g" : "gi";
              currentName = currentName.replace(new RegExp(esc, flags), options.replace || "");
            } else {
              try {
                const flags = options.caseSensitive ? "g" : "gi";
                currentName = currentName.replace(new RegExp(options.find, flags), options.replace || "");
              } catch {
                /* ignore invalid regex */
              }
            }
          }
          break;
        }

        case "case": {
          const options = rule.options;
          switch (options.format) {
            case "lowercase":
              currentName = currentName.toLowerCase();
              break;
            case "uppercase":
              currentName = currentName.toUpperCase();
              break;
            case "capitalize":
              currentName = currentName.charAt(0).toUpperCase() + currentName.slice(1);
              break;
            case "titlecase":
              currentName = currentName.replace(
                /\w\S*/g,
                (txt) => txt.charAt(0).toUpperCase() + txt.substring(1).toLowerCase(),
              );
              break;
          }
          break;
        }

        case "add": {
          const options = rule.options;
          if (options.text) {
            if (options.position === "start") currentName = options.text + currentName;
            if (options.position === "end") currentName = currentName + options.text;
          }
          break;
        }

        case "number": {
          const options = rule.options;
          const start = Number(options.start) || 1;
          const step = Number(options.step) || 1;
          const currentNum = start + index * step;
          const numStr = currentNum.toString().padStart(options.padding || 1, "0");
          const separator = options.separator || "";

          if (options.position === "start") currentName = `${numStr}${separator}${currentName}`;
          if (options.position === "end") currentName = `${currentName}${separator}${numStr}`;
          break;
        }

        case "trim":
          currentName = currentName.trim();
          break;
      }
    } catch (error) {
      console.error(error);
    }
  }

  return { name: currentName, extension: currentExt };
};
