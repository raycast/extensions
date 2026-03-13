export type CommandGroup = { id: string; name: string; commands: number; runningCommands: number };
export type Command = { id: string; name: string; status: "stopped" | "running" };
