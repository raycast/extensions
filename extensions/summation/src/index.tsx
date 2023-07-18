import { showToast, Toast, ActionPanel, Action, Detail, getSelectedText, Clipboard } from "@raycast/api";
import { useState, useEffect } from "react";

interface SubjectedText {
  source: string;
  text: string;
  error?: string;
}

async function getSubjectedText() {
  let source = "selection";
  let error;
  let text;

  try {
    text = await getSelectedText();
    text = text
      .split("\n")
      .filter((line) => line.length)
      .join("\n");
  } catch (e) {
    text = "";
  }

  if (text.length == 0) {
    source = "clipboard";
    const clipText = await Clipboard.readText();
    text = clipText == undefined ? "" : clipText;
  }
  text = text
    .replace(/^[\s]+/, "") // trim start
    .replace(/[\s]+$/, "") // trim end
    .split("\n")
    .filter((line) => line.length)
    .join("\n"); // remove empty lines
  if (text.length == 0) {
    error = "unable to find selected text or text from the clipboard";
  }
  const subject: SubjectedText = { error, source, text };
  return subject;
}

interface CalculationResult {
  errorMessage?: string;
  subject?: SubjectedText;
  numbers?: number[];
  formattedNumbers?: string[];
  sum?: number;
  sumStr?: string;
}

async function calculateResult() {
  const subject = await getSubjectedText();

  if (subject.error) {
    const noInput: CalculationResult = { errorMessage: subject.error, subject };
    return noInput;
  }

  const decimalSeparator = (0.1).toLocaleString().replace(/\d/g, "");
  const groupSeparator = (1000).toLocaleString().replace(/\d/g, "");

  const numbersStr = subject.text
    .split("\n")
    // remove group separators
    .map((n) => n.replaceAll(groupSeparator, ""))
    // remove non-numbers
    .filter((n) => {
      try {
        const num = Number(n);
        return isNaN(num) ? false : Number.isFinite(num);
      } catch (e) {
        return false;
      }
    });

  if (numbersStr.length == 0) {
    const badInput: CalculationResult = {
      errorMessage: `no recognizable numbers found, select numbers or copy to clipboard and try again`,
      subject,
    };
    return badInput;
  }

  // find max precision
  const precision = numbersStr
    .map((n) => {
      let numStr = `${n}${decimalSeparator}`;
      if (`${n}` != `${Number(n)}`) {
        // this handles scientific notations, both +- exponents
        numStr = `${Number(n)}${decimalSeparator}`;
      }
      // there's a decimalSeparator at the end of numStr to handle integers
      // the split below will always result to at least 2 elements
      return numStr.split(decimalSeparator)[1].length;
    })
    .sort()
    .reverse()[0];
  const numbers = numbersStr.map((n) => Number(n));

  // actually calculates the sum
  const sum = numbers.reduce((a, c) => a + c, 0);

  const sumStr = sum.toLocaleString(undefined, { minimumFractionDigits: precision });

  // need the position of the decimal to use as alignment
  const sumLength = sumStr.length;
  let decimalIndex = sumStr.indexOf(decimalSeparator);
  if (decimalIndex == -1) {
    decimalIndex = sumLength;
  }
  decimalIndex = decimalIndex + 1;

  // format numbers so they are aligned at the decimal point
  const formattedNumbers = numbers.map((n) => {
    let nStr = n.toLocaleString(undefined, { maximumFractionDigits: precision });
    const nArr = `${nStr}${decimalSeparator}`.split(decimalSeparator);
    const whole = nArr[0];
    const decimal = nArr[1];
    let dpIndex = `${nStr}`.indexOf(decimalSeparator);
    if (dpIndex == -1) dpIndex = nStr.length;
    nStr = whole.padStart(decimalIndex, " ");
    return `+ ${nStr}` + (decimal == "" ? "" : `${decimalSeparator}${decimal}`);
  });

  const results: CalculationResult = {
    errorMessage: "",
    subject,
    numbers,
    formattedNumbers,
    sum,
    sumStr,
  };

  return results;
}

function formatOutput(data: CalculationResult) {
  if (data.errorMessage) {
    return data.errorMessage;
  }

  const content = [
    `${data?.formattedNumbers ? data?.formattedNumbers.join("\n").replace(/^./, " ") : ""}`,
    `==${"=".repeat(data?.sumStr ? data?.sumStr.length + 1 : 3)} `,
    `   ${data?.sumStr} `,
    "",
  ].join("\n");

  return content;
}

function formatTitle(data: CalculationResult) {
  return `## Summarizing from ${data?.subject?.source}\n`;
}

export default function Command() {
  const [result, setResult] = useState<CalculationResult>({});
  const [display, setDisplay] = useState("");
  const [title, setTitle] = useState("");
  const [isLoading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    calculateResult()
      .then((res) => {
        setResult(res);
        setDisplay(formatOutput(res));
        setTitle(formatTitle(res));
        setLoading(false);
      })
      .catch((err) => {
        setLoading(false);
        showToast({ title: "Error", message: err.message, style: Toast.Style.Failure });
      });
  }, []);

  return (
    <Detail
      isLoading={isLoading}
      markdown={`${title}\`\`\`\n${display}\n\`\`\``}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard content={`${result?.sum}`} title="Copy Sum" />
          <Action.CopyToClipboard content={display} title="Copy Calculation" />
        </ActionPanel>
      }
    />
  );
}
