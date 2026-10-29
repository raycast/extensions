export interface AquaPackage {
  type: string;
  path?: string;
  repo_owner?: string;
  repo_name?: string;
  description?: string;
  name?: string;
  link?: string;
  files?: { name: string; src?: string }[];
  supported_envs?: string[];
}

export interface RegistryData {
  packages: AquaPackage[];
}

type ListField = "files" | "supported_envs";
type BlockStyle = ">" | "|";

const PACKAGE_START_PATTERN = /^ {2}- ([a-z_]+):(.*)$/;
const ROOT_FIELD_PATTERN = /^ {4}([a-z_]+):(.*)$/;
const FILE_ITEM_PATTERN = /^ {6}- name:(.*)$/;
const FILE_SOURCE_PATTERN = /^ {8}src:(.*)$/;
const LIST_ITEM_PATTERN = /^ {6}-(.*)$/;

/**
 * Parse only the registry fields used by the extension.
 *
 * The generated registry is several megabytes, and a general-purpose YAML parser can exceed
 * Raycast's 100 MB command heap while materializing fields that the UI never reads. This
 * line-oriented parser keeps the command small while still handling every supported package shape.
 */
export function parseRegistry(source: string): RegistryData {
  const packages: AquaPackage[] = [];
  let currentPackage: Partial<AquaPackage> | null = null;
  let activeList: ListField | undefined;
  let blockStyle: BlockStyle | undefined;
  let blockKeepsTrailingNewline = false;
  let blockLines: string[] = [];

  const finishBlock = () => {
    if (!currentPackage || !blockStyle) return;

    const description =
      blockStyle === ">"
        ? blockLines
            .map((line) => line.trim())
            .join(" ")
            .replace(/\s+/g, " ")
            .trim()
        : blockLines.join("\n").trim();

    currentPackage.description = blockKeepsTrailingNewline ? `${description}\n` : description;

    blockStyle = undefined;
    blockKeepsTrailingNewline = false;
    blockLines = [];
  };

  const finishPackage = () => {
    finishBlock();
    if (!currentPackage) return;

    const hasIdentifier =
      Boolean(currentPackage.name) ||
      Boolean(currentPackage.repo_owner && currentPackage.repo_name) ||
      Boolean(currentPackage.path);

    if (!currentPackage.type || !hasIdentifier) {
      throw new Error(`Invalid registry package at index ${packages.length}`);
    }

    packages.push(currentPackage as AquaPackage);
    currentPackage = null;
    activeList = undefined;
  };

  const setField = (field: string, rawValue: string) => {
    if (!currentPackage) return;

    activeList = undefined;
    const value = rawValue.trim();

    if (field === "files") {
      activeList = field;
      currentPackage.files = [];
      return;
    }

    if (field === "supported_envs") {
      currentPackage.supported_envs = value ? parseFlowSequence(value) : [];
      if (!value) activeList = field;
      return;
    }

    if (field === "description" && /^[>|][-+]?$/.test(value)) {
      blockStyle = value[0] as BlockStyle;
      blockKeepsTrailingNewline = !value.endsWith("-");
      blockLines = [];
      return;
    }

    if (
      field === "type" ||
      field === "path" ||
      field === "repo_owner" ||
      field === "repo_name" ||
      field === "description" ||
      field === "name" ||
      field === "link"
    ) {
      currentPackage[field] = parseScalar(value);
    }
  };

  const processLine = (line: string) => {
    if (blockStyle) {
      if (line.length === 0 || line.startsWith("      ")) {
        blockLines.push(line.length === 0 ? "" : line.slice(6));
        return;
      }
      finishBlock();
    }

    const packageStart = PACKAGE_START_PATTERN.exec(line);
    if (packageStart) {
      finishPackage();
      currentPackage = {};
      setField(packageStart[1], packageStart[2]);
      return;
    }

    if (!currentPackage) return;

    const rootField = ROOT_FIELD_PATTERN.exec(line);
    if (rootField) {
      setField(rootField[1], rootField[2]);
      return;
    }

    if (activeList === "files") {
      const fileItem = FILE_ITEM_PATTERN.exec(line);
      if (fileItem) {
        const name = parseScalar(fileItem[1]);
        if (name) currentPackage.files?.push({ name });
        return;
      }

      const fileSource = FILE_SOURCE_PATTERN.exec(line);
      if (fileSource && currentPackage.files?.length) {
        const src = parseScalar(fileSource[1]);
        const file = currentPackage.files[currentPackage.files.length - 1];
        if (src) file.src = src;
      }
      return;
    }

    if (activeList === "supported_envs") {
      const listItem = LIST_ITEM_PATTERN.exec(line);
      if (listItem) {
        const environment = parseScalar(listItem[1]);
        if (environment) currentPackage.supported_envs?.push(environment);
      }
    }
  };

  let lineStart = 0;
  for (let index = 0; index <= source.length; index += 1) {
    if (index !== source.length && source.charCodeAt(index) !== 10) continue;

    const lineEnd = index > lineStart && source.charCodeAt(index - 1) === 13 ? index - 1 : index;
    processLine(source.slice(lineStart, lineEnd));
    lineStart = index + 1;
  }

  finishPackage();

  return { packages };
}

function parseFlowSequence(rawValue: string): string[] {
  const value = rawValue.trim();
  if (!value.startsWith("[")) {
    throw new Error("Invalid inline list");
  }

  let quote: '"' | "'" | undefined;
  let closingIndex = -1;

  for (let index = 1; index < value.length; index += 1) {
    const character = value[index];

    if (quote === '"' && character === "\\") {
      index += 1;
      continue;
    }
    if (quote === "'" && character === "'" && value[index + 1] === "'") {
      index += 1;
      continue;
    }
    if (quote) {
      if (character === quote) quote = undefined;
      continue;
    }
    if (character === '"' || character === "'") {
      quote = character;
      continue;
    }
    if (character === "]") {
      closingIndex = index;
      break;
    }
  }

  if (closingIndex === -1) throw new Error("Invalid inline list");

  const trailingValue = value.slice(closingIndex + 1).trim();
  if (trailingValue && !trailingValue.startsWith("#")) {
    throw new Error("Invalid inline list");
  }

  const content = value.slice(1, closingIndex);
  const items: string[] = [];
  let itemStart = 0;
  quote = undefined;

  const addItem = (rawItem: string, allowEmpty: boolean) => {
    if (!rawItem.trim()) {
      if (allowEmpty) return;
      throw new Error("Invalid inline list");
    }

    const item = parseScalar(rawItem);
    if (item) items.push(item);
  };

  for (let index = 0; index < content.length; index += 1) {
    const character = content[index];

    if (quote === '"' && character === "\\") {
      index += 1;
      continue;
    }
    if (quote === "'" && character === "'" && content[index + 1] === "'") {
      index += 1;
      continue;
    }
    if (quote) {
      if (character === quote) quote = undefined;
      continue;
    }
    if (character === '"' || character === "'") {
      quote = character;
      continue;
    }
    if (character === ",") {
      addItem(content.slice(itemStart, index), false);
      itemStart = index + 1;
    }
  }

  addItem(content.slice(itemStart), content.trim().endsWith(",") || !content.trim());
  return items;
}

function parseScalar(rawValue: string): string {
  const value = rawValue.trim();
  if (!value || value === "null" || value === "~") return "";

  if (value.startsWith('"') && value.endsWith('"')) {
    try {
      return JSON.parse(value) as string;
    } catch {
      return value.slice(1, -1).replace(/\\"/g, '"').replace(/\\\\/g, "\\");
    }
  }

  if (value.startsWith("'") && value.endsWith("'")) {
    return value.slice(1, -1).replace(/''/g, "'");
  }

  const commentIndex = value.search(/\s+#/);
  return (commentIndex === -1 ? value : value.slice(0, commentIndex)).trim();
}
