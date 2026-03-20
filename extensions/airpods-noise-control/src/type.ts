/** Parsed preferences with airpodsIndex converted to number for AppleScript execution */
export interface ExecPrefs {
  airpodsIndex: number;
  airpodsType: "pro" | "max";
  soundLoc: string;
  optionOne: string;
  optionTwo: string;
  showHudNC: boolean;
  showHudCA: boolean;
}
