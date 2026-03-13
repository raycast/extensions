/**
 * Default custom placeholders that are included with the extension as examples.
 */
export const defaultCustomPlaceholders = {
  "{{showDialog:(([^{]|{(?!{)|{{[\\s\\S]*?}})*?)}}": {
    name: "showDialog",
    description: "Displays a dialog window with the given text as its message.",
    value: '{{as:display dialog "$1"}}',
    example: "{{showDialog:Hello world!}}",
    hintRepresentation: "{{showDialog:...}}",
  },
  "{{showAlert:([\\s\\S]*?)(:([\\s\\S]*?))?}}": {
    name: "showAlert",
    description: "Displays an alert with the given message and optional title.",
    value: '{{as:display alert "$1" message "$3"}}',
    example: "{{showAlert:Hello:World!}}",
    hintRepresentation: "{{showAlert:...}}",
  },
  "{{showList((:([^{])+?)*?)}}": {
    name: "showList",
    description:
      "Displays a list of items for the user to choose from and waits for their response. The placeholder will be replaced with the user's selection.",
    value:
      '{{js:const result = \'$1\'; const regex = /((?<=:)[^:]*?(?=(:|$)))+/g; const matches = result.match(regex); const ls = matches.join(\'", "\'); as(`set theAnswer to choose from list {"${ls}"}\nreturn theAnswer`).then((answer) => { as(`tell application "System Events"\nopen location "raycast://"\nend tell`); return answer });}}',
    example: "Tell me a true story about {{showList:AI:Steve Jobs:Computer History}}",
    hintRepresentation: "{{showList:...:...:...}}",
  },
  "{{localSummary( sentences=(\\d+))?:(([^{]|{(?!{)|{{[\\s\\S]*?}})*?)}}": {
    name: "localSummary",
    description:
      "Summarizes text using macOS' native summarization tool. Accepts sentence count as an optional parameter.",
    value:
      '{{as:set numSentences to "$2" \n if length of numSentences is 0 then set numSentences to 2 \n set numSentences to (numSentences as number) \n summarize "$3" in numSentences}}',
    example: "{{localSummary sentences=1:There's a snake in my boot!}}",
    hintRepresentation: "{{localSummary:...}}",
  },
};
