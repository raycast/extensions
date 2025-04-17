export const BTT_NOT_RUNNING_ERROR = "BetterTouchTool must be running to use this extension!";

/**
 * Creates a JXA script with proper BTT running checks
 * @param scriptBody A function that takes the BTT variable name and returns the script body
 * @returns Complete JXA script as a string
 */
export function createJXAScript(scriptBody: (bttApp: string) => string): string {
  const bttVarName = "btt";
  return `
function run() {
  let ${bttVarName};
  try {
    ${bttVarName} = Application('BetterTouchTool');
  } catch (e) {
    return "error: BetterTouchTool is not installed";
  }
  
  if (!${bttVarName}.running()) {
    return "error: ${BTT_NOT_RUNNING_ERROR}";
  }
  
  try {
    ${scriptBody(bttVarName)}
  } catch (e) {
    return "error: " + e;
  }
} run();`;
}
