export enum DeeplinkType {
  ScriptCommand = "script-command",
  Extension = "extension",
}

export function createScriptCommandDeeplink(options: {
  command: string;
  arguments?: string[];
}): string {
  const argumentsQuery = options.arguments
    ?.map((argument) => `arguments=${encodeURIComponent(argument)}`)
    .join("&");
  return `raycast://script-commands/${options.command}${argumentsQuery ? `?${argumentsQuery}` : ""}`;
}
