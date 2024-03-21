import { RollType } from "enums";

export const parseCommand = (command: string) => {
  const parsed = command.match(/^(\d+)?d(\d+)(?::(dis|adv))?$/);
  if (parsed) {
    const [, times, die, type] = parsed;
    return { times: Number(times), die: Number(die), type: type as RollType } as const;
  }

  return parsed;
};
