import { Clipboard, LaunchProps, showToast, Toast } from "@raycast/api";

export default async function Command(props: LaunchProps) {
  const { rows, columns } = props.arguments;

  const numberOfRows = parseInt(rows, 10);
  const numberOfColumns = parseInt(columns, 10);
  function generateMarkdownTable(numberOfColumns: number, numberOfRows: number): string {
    let table = "";

    // Generate the table header and separator
    for (let i = 0; i < 2; i++) {
      table += "|";
      for (let col = 0; col < numberOfColumns; col++) {
        table += i === 0 ? ` Column ${col + 1} |` : " --- |";
      }
      table += "\n";
    }

    // Generate the table rows
    for (let row = 0; row < numberOfRows; row++) {
      table += "|";
      for (let col = 0; col < numberOfColumns; col++) {
        table += ` Cell ${row + 1}-${col + 1} |`;
      }
      table += "\n";
    }

    return table;
  }
  if (Number.isInteger(numberOfRows) && Number.isInteger(numberOfColumns) && numberOfRows > 0 && numberOfColumns > 0) {
    showToast(Toast.Style.Success, "Markdown table copied to clipboard!");
    await Clipboard.copy(generateMarkdownTable(numberOfColumns, numberOfRows));
  } else {
    showToast(Toast.Style.Failure, "Please enter an integer value greater than zero for both rows and columns.");
  }
}
