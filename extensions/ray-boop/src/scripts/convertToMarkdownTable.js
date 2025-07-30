/**
{
  "api":1,
  "name":"Convert to pretty markdown table",
  "description":"Converts csv, tsv or markdown table into pretty markdown table format.",
  "author":"xshoji",
  "icon":"term",
  "tags":"csv,tsv,md,markdown"
}
**/
export function main(input) {
  input.text = convertToPrettyMarkdownTableFormat(input.text);
}

function convertToPrettyMarkdownTableFormat(input) {
  const list = input
    .trim()
    .replace(/^(\r?\n)+$/g, "\n")
    .split("\n")
    .map((v) => v.replace(/^\||\|$/g, ""));
  const delimiter = [`|`, `\t`, `","`, `,`].find((v) => list[0].split(v).length > 1);
  if (delimiter === `|`) {
    // If input text is markdown table format, removes header separator.
    list.splice(1, 1);
  }
  const tableElements = list.map((record) => record.split(delimiter).map((v) => v.trim()));
  const calcBytes = (character) => {
    let length = 0;
    for (let i = 0; i < character.length; i++) {
      const c = character.charCodeAt(i);
      // Multibyte handling
      if ((c >= 0x0 && c < 0x81) || c === 0xf8f0 || (c >= 0xff61 && c < 0xffa0) || (c >= 0xf8f1 && c < 0xf8f4)) {
        length += 1;
      } else {
        length += 2;
      }
    }
    return length;
  };
  const columnMaxLengthList = tableElements[0]
    .map((v, i) => i)
    .reduce((map, columnIndex) => {
      let maxLength = 0;
      tableElements.forEach((record) =>
        maxLength < calcBytes(record[columnIndex]) ? (maxLength = calcBytes(record[columnIndex])) : null,
      );
      if (maxLength === 1) {
        // Avoids markdown header line becomes only ":" ( ":-" is correct. ).
        maxLength = 2;
      }
      map[columnIndex] = maxLength;
      return map;
    }, {});
  const formattedTableElements = tableElements.map((record) =>
    record.map((value, columnIndex) => value + "".padEnd(columnMaxLengthList[columnIndex] - calcBytes(value), " ")),
  );
  const headerValues = formattedTableElements.shift();
  const tableLine = headerValues.map((v) => "".padStart(calcBytes(v), "-").replace(/^./, ":"));
  formattedTableElements.unshift(tableLine);
  formattedTableElements.unshift(headerValues);
  return formattedTableElements.map((record) => "| " + record.join(" | ") + " |").join("\n");
}
