export interface RenameRule {
  id: string;
  type: RuleType;
  options: any;
}

export type RuleType = "replace" | "case" | "add" | "number" | "trim" | "extension";

export interface FileItem {
  originalPath: string;
  name: string;
  extension: string;
  isDirectory: boolean;
  newName?: string;
  error?: string;
}

export const applyRules = (file: FileItem, rules: RenameRule[], index: number): string => {
  let name = file.name; // Operate on base name usually, or full name depending on logic

  for (const rule of rules) {
    try {
      switch (rule.type) {
        case "replace":
          if (rule.options.find) {
            const flags = rule.options.caseSensitive ? "g" : "gi";
            const search = rule.options.isRegex
              ? new RegExp(rule.options.find, flags)
              : rule.options.find.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); // simple string literal replacement simulation if needed or just use replaceAll

            // For simple string replace without regex, we can use replaceAll if not regex
            if (!rule.options.isRegex) {
              if (rule.options.caseSensitive) {
                name = name.replaceAll(rule.options.find, rule.options.replace || "");
              } else {
                // Case insensitive string replace is tricky with replaceAll without regex
                // Easiest is to convert to regex
                const esc = rule.options.find.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
                name = name.replace(new RegExp(esc, "gi"), rule.options.replace || "");
              }
            } else {
              name = name.replace(search, rule.options.replace || "");
            }
          }
          break;

        case "case":
          switch (rule.options.format) {
            case "lowercase":
              name = name.toLowerCase();
              break;
            case "uppercase":
              name = name.toUpperCase();
              break;
            case "capitalize":
              name = name.charAt(0).toUpperCase() + name.slice(1);
              break;
            case "titlecase":
              name = name.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
              break;
          }
          break;

        case "add":
          if (rule.options.text) {
            if (rule.options.position === "start") name = rule.options.text + name;
            if (rule.options.position === "end") name = name + rule.options.text;
            if (rule.options.position === "index" && typeof rule.options.index === "number") {
              const idx = Math.min(Math.max(0, rule.options.index), name.length);
              name = name.slice(0, idx) + rule.options.text + name.slice(idx);
            }
          }
          break;

        case "number":
          const start = Number(rule.options.start) || 1;
          const step = Number(rule.options.step) || 1;
          const currentNum = start + index * step;
          const numStr = currentNum.toString().padStart(rule.options.padding || 1, "0");
          const separator = rule.options.separator || "";

          if (rule.options.position === "start") name = `${numStr}${separator}${name}`;
          if (rule.options.position === "end") name = `${name}${separator}${numStr}`;
          break;

        case "trim":
          name = name.trim();
          break;

        case "extension":
          // This affects extension, returns immediately or we handle it specially outside?
          // Ideally we return the FULL new filename. But our function inputs "name" (base name).
          // Let's assume this function returns the new BASE name, and extension logic handles extension.
          // BUT "extension" rule needs to modify the extension part.
          // Refactor: applyRules should take { name, extension } and return { name, extension }
          break;
      }
    } catch (e) {
      console.error(`Rule failed: ${rule.type}`, e);
    }
  }
  return name;
};

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
        if (rule.options.mode === "lowercase") currentExt = currentExt.toLowerCase();
        if (rule.options.mode === "uppercase") currentExt = currentExt.toUpperCase();
        if (rule.options.mode === "remove") currentExt = "";
        if (rule.options.mode === "replace" && rule.options.newExt) {
          currentExt = rule.options.newExt.startsWith(".") ? rule.options.newExt : `.${rule.options.newExt}`;
        }
        continue;
      }

      // Other rules apply to the name part
      // Re-use logic above but adapted here inline for simplicity or call helper
      switch (rule.type) {
        case "replace":
          if (rule.options.find) {
            if (!rule.options.isRegex) {
              const esc = rule.options.find.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
              const flags = rule.options.caseSensitive ? "g" : "gi";
              currentName = currentName.replace(new RegExp(esc, flags), rule.options.replace || "");
            } else {
              try {
                const flags = rule.options.caseSensitive ? "g" : "gi";
                currentName = currentName.replace(new RegExp(rule.options.find, flags), rule.options.replace || "");
              } catch {
                /* ignore invalid regex */
              }
            }
          }
          break;

        case "case":
          switch (rule.options.format) {
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
                (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase(),
              );
              break;
          }
          break;

        case "add":
          if (rule.options.text) {
            if (rule.options.position === "start") currentName = rule.options.text + currentName;
            if (rule.options.position === "end") currentName = currentName + rule.options.text;
          }
          break;

        case "number":
          const start = Number(rule.options.start) || 1;
          const step = Number(rule.options.step) || 1;
          const currentNum = start + index * step;
          const numStr = currentNum.toString().padStart(rule.options.padding || 1, "0");
          const separator = rule.options.separator || "";

          if (rule.options.position === "start") currentName = `${numStr}${separator}${currentName}`;
          if (rule.options.position === "end") currentName = `${currentName}${separator}${numStr}`;
          break;

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
