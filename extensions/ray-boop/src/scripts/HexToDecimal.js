/**
 {
   "api": 1,
   "name": "Hex to Dec",
   "description": "Converts hexadecimal to decimal.",
   "author": "Maurice",
   "icon": "metamorphose",
   "tags": "decimal,hexadecimal,dec,hex"
 }
 **/

export function main(state) {
  var text = state.text;
  var lines = text.split(/\n/);
  var result = "";

  for (const index in lines) {
    var lineText = lines[index].trim();
    var decimal = parseInt(lineText, 16);

    if (isNaN(decimal)) {
      result += lineText;
    } else {
      result += decimal;
    }

    result += "\n";
  }

  state.text = result.trim();
}
