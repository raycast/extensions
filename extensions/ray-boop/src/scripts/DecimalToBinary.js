/**
 {
   "api": 1,
   "name": "Decimal to Binary",
   "description": "Converts decimal values to binary.",
   "author": "Maurice",
   "icon": "metamorphose",
   "tags": "decimal,binary,dec,bin"
 }
 **/

export function main(state) {
  var text = state.text;
  var lines = text.split(/\n/);
  var result = "";

  for (const index in lines) {
    var lineText = lines[index].trim();
    var bin = parseInt(lineText).toString(2).toUpperCase();

    if (isNaN(bin)) {
      result += lineText;
    } else {
      result += bin;
    }

    result += "\n";
  }

  state.text = result.trim();
}
