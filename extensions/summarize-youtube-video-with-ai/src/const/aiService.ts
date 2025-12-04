import { environment } from "@raycast/api";
import { CommandNames } from "./command_names";

export const aiService = CommandNames[environment.commandName as keyof typeof CommandNames];
