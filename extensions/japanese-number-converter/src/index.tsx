import { Detail, LaunchProps, ActionPanel, Action, showToast, Toast } from "@raycast/api";
import { kanji2number } from "@geolonia/japanese-numeral";

let md: string;
let num: number;
let numComma: string;

export default function Command({ arguments: { jpNumber } }: LaunchProps<{ arguments: Arguments.Index }>) {
  try {
    num = kanji2number(jpNumber.replace(",", ""));
    numComma = num.toLocaleString();
    md = `
## Input

${jpNumber} 

## Output

${numComma}`;
  } catch (error) {
    const errMsg = `Error converting ${jpNumber}. Please ensure it's a valid Japanese numeral. eg 一、二、三, 430万, `;
    md = errMsg;
    showToast({
      style: Toast.Style.Failure,
      title: "Something went wrong",
      message: errMsg,
    });
  }

  return (
    <Detail
      markdown={md}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard content={numComma} title={`Copy ${numComma} to Clipboard`} />
          <Action.CopyToClipboard content={num} title={`Copy ${num} to Clipboard`} />
        </ActionPanel>
      }
    />
  );
}
