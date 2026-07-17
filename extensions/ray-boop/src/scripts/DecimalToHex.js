/**
 {
   "api": 1,
   "name": "Decimal to Hex",
   "description": "Converts decimal values to hexadecimal.",
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

    if (isNaN(lineText)) {
      result += lineText;
    } else {
      result += parseInt(lineText).toString(16).toUpperCase();
    }

    result += "\n";
  }

  state.text = result.trim();
}
