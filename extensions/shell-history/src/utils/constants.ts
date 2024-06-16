import { getDefaultApplication } from "@raycast/api";

export const TERMINAL = "/System/Applications/Utilities/Terminal.app";
export const ITERM2 = "/Applications/iTerm.app";
const terminalPath = [TERMINAL, ITERM2];

export const getTerminals = async () => {
  const terminals = [];
  for (const terminal of terminalPath) {
    try {
      const app = await getDefaultApplication(terminal);
      terminals.push(app);
    } catch (e) {
      console.error("Application not found: ", terminal);
    }
  }
  return terminals;
};
