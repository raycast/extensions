export type RuleBlock = {
  start: number;
  end: number;
  lines: string[];
};

export type WindowRuleOptions = {
  bundleId: string;
  appName: string;
  floating: boolean;
  workspace: string;
};

function tableHeader(line: string): string | null {
  const value = line.replace(/\s+#.*$/, "").trim();
  const arrayTable = value.match(/^\[\[([^[\]]+)\]\]$/);
  if (arrayTable) return arrayTable[1].trim();
  const table = value.match(/^\[([^[\]]+)\]$/);
  return table ? table[1].trim() : null;
}

export function ruleBlocks(lines: string[]): RuleBlock[] {
  const starts = lines
    .map((line, index) =>
      tableHeader(line) === "on-window-detected" && line.trimStart().startsWith("[[") ? index : -1,
    )
    .filter((index) => index >= 0);

  return starts.map((start) => {
    let end = lines.length;
    for (let index = start + 1; index < lines.length; index += 1) {
      if (tableHeader(lines[index])) {
        end = index;
        break;
      }
    }
    return { start, end, lines: lines.slice(start, end) };
  });
}

export function appIdForRule(block: RuleBlock): string | null {
  for (const line of block.lines) {
    const match = line.match(/^\s*if\.app-id\s*=\s*(['"])(.*?)\1\s*$/);
    if (match) return match[2];
  }
  return null;
}

function runLineIndex(block: RuleBlock): number {
  const indexes = block.lines
    .map((line, index) => (/^\s*run\s*=/.test(line) ? index : -1))
    .filter((index) => index >= 0);
  if (indexes.length > 1) {
    throw new Error("This application has multiple run entries. Edit it manually to avoid changing its meaning.");
  }
  return indexes[0] ?? -1;
}

export function commandsForRule(block: RuleBlock): string[] {
  const index = runLineIndex(block);
  if (index < 0) return [];

  const line = block.lines[index];
  const value = line.slice(line.indexOf("=") + 1).trim();
  if (!value) return [];
  if (value.startsWith("[") && !value.endsWith("]")) {
    throw new Error(
      "This application already has a multiline window rule. Edit it manually to avoid losing custom commands.",
    );
  }
  const quoted = [...value.matchAll(/(['"])(.*?)\1/g)].map((match) => match[2]);
  return quoted.length ? quoted : [value.replace(/^['"]|['"]$/g, "")];
}

function assertCompatibleRule(block: RuleBlock): void {
  const unsupported = block.lines.filter((line) => {
    const value = line.trim();
    if (!value || value.startsWith("#") || tableHeader(line)) return false;
    return !/^(if\.app-id|run)\s*=/.test(value);
  });
  if (unsupported.length) {
    throw new Error(
      "This application rule has additional conditions or settings. Edit it manually so they are not changed.",
    );
  }
}

function hasRootInlineRules(lines: string[]): boolean {
  for (const line of lines) {
    if (tableHeader(line)) return false;
    if (/^\s*on-window-detected\s*=/.test(line)) return true;
  }
  return false;
}

function formattedRun(commands: string[]): string {
  return commands.length === 1
    ? `run = ${JSON.stringify(commands[0])}`
    : `run = [${commands.map((command) => JSON.stringify(command)).join(", ")}]`;
}

export function updateWindowRuleContent(content: string, options: WindowRuleOptions): string {
  const lines = content.split(/\r?\n/);
  const existing = ruleBlocks(lines).find((candidate) => appIdForRule(candidate) === options.bundleId);

  if (!existing && hasRootInlineRules(lines)) {
    throw new Error(
      "This configuration uses inline on-window-detected rules. Convert them to [[on-window-detected]] blocks before saving persistent rules.",
    );
  }
  if (existing) assertCompatibleRule(existing);

  const preservedCommands = existing
    ? commandsForRule(existing).filter(
        (command) => command !== "layout floating" && !command.startsWith("move-node-to-workspace "),
      )
    : [];
  const commands = [
    ...(options.workspace ? [`move-node-to-workspace ${options.workspace}`] : []),
    ...(options.floating ? ["layout floating"] : []),
    ...preservedCommands,
  ];

  if (existing) {
    const relativeRunIndex = runLineIndex(existing);
    if (commands.length) {
      if (relativeRunIndex >= 0) {
        lines[existing.start + relativeRunIndex] = formattedRun(commands);
      } else {
        let insertionIndex = existing.end;
        while (insertionIndex > existing.start + 1 && !lines[insertionIndex - 1].trim()) {
          insertionIndex -= 1;
        }
        lines.splice(insertionIndex, 0, formattedRun(commands));
      }
    } else {
      let start = existing.start;
      if (start > 0 && lines[start - 1].startsWith("# Managed by AeroSpace Control Center:")) {
        start -= 1;
      }
      let end = existing.end;
      while (end > existing.start && !lines[end - 1].trim()) end -= 1;
      lines.splice(start, end - start);
    }
  } else if (commands.length) {
    const safeName = options.appName.replace(/[\r\n]+/g, " ").trim();
    if (lines.at(-1)?.trim()) lines.push("");
    lines.push(
      `# Managed by AeroSpace Control Center: ${safeName}`,
      "[[on-window-detected]]",
      `if.app-id = ${JSON.stringify(options.bundleId)}`,
      formattedRun(commands),
      "",
    );
  }

  return `${lines.join("\n").trimEnd()}\n`;
}

export function recommendedFloatingRules(entries: readonly (readonly [string, string])[]): string {
  const blocks = entries.map(
    ([name, bundleId]) =>
      `# ${name}\n[[on-window-detected]]\nif.app-id = ${JSON.stringify(bundleId)}\nrun = "layout floating"`,
  );
  return `# Raycast AeroSpace Control Center — recommended chat-app behavior\n# These apps float by default so conversations do not disturb the tiled workspace.\n${blocks.join(
    "\n\n",
  )}\n\n`;
}
