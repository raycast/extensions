import { Form, ActionPanel, Action, Detail } from "@raycast/api";
import { useForm } from "@raycast/utils";
import { useState } from "react";

export default function CalculateScore() {
  let [useIncorrect, setUseIncorrect] = useState(true);
  let [showingResults, setShowingResults] = useState(false);
  let [readingCorrect, setReadingCorrect] = useState(52);
  let [writingCorrect, setWritingCorrect] = useState(52);
  let [mathCorrect, setMathCorrect] = useState(52);

  let readingMap = [
    10, 10, 10, 11, 12, 13, 14, 15, 15, 16, 17, 17, 18, 19, 19, 20, 20, 21, 21, 22, 22, 23, 23, 24, 24, 25, 25, 26, 26,
    27, 28, 28, 29, 29, 30, 30, 31, 31, 32, 32, 33, 33, 34, 35, 35, 36, 37, 37, 38, 38, 39, 40, 40,
  ];
  let mathMap = [
    200, 200, 210, 230, 240, 260, 280, 290, 310, 320, 330, 340, 360, 370, 380, 390, 410, 420, 430, 440, 450, 460, 470,
    480, 480, 490, 500, 510, 520, 520, 530, 540, 550, 560, 560, 570, 580, 590, 600, 600, 610, 620, 630, 640, 650, 660,
    670, 670, 680, 690, 700, 710, 730, 740, 750, 760, 780, 790, 800,
  ];
  let writingMap = [
    10, 10, 10, 10, 11, 12, 13, 13, 14, 15, 16, 16, 17, 18, 19, 19, 20, 21, 21, 22, 23, 23, 24, 25, 25, 26, 26, 27, 28,
    28, 29, 30, 30, 31, 32, 32, 33, 34, 34, 35, 36, 37, 38, 39, 40,
  ];

  const { handleSubmit, itemProps } = useForm({
    onSubmit: (val) => {
      let readingScore = val.reading,
        writingScore = val.writing;

      let mathScore;

      if (useIncorrect) {
        mathScore =
          (val.mathCalc === "" ? 0 : parseInt(val.mathCalc)) + (val.mathNoCalc === "" ? 0 : parseInt(val.mathNoCalc));
      } else {
        mathScore =
          (val.mathCalc === "" ? 38 : parseInt(val.mathCalc)) + (val.mathNoCalc === "" ? 20 : parseInt(val.mathNoCalc));
      }

      if (useIncorrect) {
        setReadingCorrect(52 - (readingScore === "" ? 0 : readingScore));
        setWritingCorrect(44 - (writingScore === "" ? 0 : writingScore));
        setMathCorrect(58 - mathScore);
      } else {
        setReadingCorrect(readingScore === "" ? 52 : readingScore);
        setWritingCorrect(writingScore === "" ? 44 : writingScore);
        setMathCorrect(mathScore);
      }
      setShowingResults(true);
    },
    validation: {
      reading: (val) => {
        if (!(val >= 0 && val <= 52)) {
          return "Must be between 0 and 52";
        }
      },
      writing: (val) => {
        if (!(val >= 0 && val <= 44)) {
          return "Must be between 0 and 44";
        }
      },
      mathNoCalc: (val) => {
        if (!(val >= 0 && val <= 20)) {
          return "Must be between 0 and 20";
        }
      },
      mathCalc: (val) => {
        if (!(val >= 0 && val <= 38)) {
          return "Must be between 0 and 38";
        }
      },
    },
  });

  return showingResults ? (
    <Detail
      markdown={`
# ${(writingMap[writingCorrect] + readingMap[readingCorrect]) * 10 + mathMap[mathCorrect]}
Out of 1600

# Score Overview

| Evidence-Based Reading and Writing Score | Math Score |
|--------------------------------------------------|--------------------|
| ${(writingMap[writingCorrect] + readingMap[readingCorrect]) * 10}/800 | ${mathMap[mathCorrect]}/800 |

# Score Breakdown

| Reading Score | Writing Score | Math Score | 
|---------------|---------------------------------|--------------------|
| ${readingMap[readingCorrect] * 10}/800 | ${writingMap[writingCorrect] * 10}/400 | ${mathMap[mathCorrect]}/800 |

    `}
    />
  ) : (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Submit" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description
        title="Tip"
        text={`If you leave any field blank, it will be set to ${useIncorrect ? "zero incorrect." : "max score."}`}
      />
      <Form.TextField
        title="Reading Score"
        placeholder={`Questions ${useIncorrect ? "incorrect" : "correct"} out of 52...`}
        {...itemProps.reading}
      />
      <Form.TextField
        title="Writing Score"
        placeholder={`Questions ${useIncorrect ? "incorrect" : "correct"} out of 44...`}
        {...itemProps.writing}
      />
      <Form.TextField
        title="Math (No-Calculator) Score"
        placeholder={`Questions ${useIncorrect ? "incorrect" : "correct"} out of 20...`}
        {...itemProps.mathNoCalc}
      />
      <Form.TextField
        title="Math (Calculator) Score"
        placeholder={`Questions ${useIncorrect ? "incorrect" : "correct"} out of 38...`}
        {...itemProps.mathCalc}
      />

      <Form.Description
        title="Input Method"
        text="Check this box if you want to input the number of problems you did incorrect instead of number of problems you did correct."
      />
      <Form.Checkbox id="useIncorrect" label="Input Number Incorrect" value={useIncorrect} onChange={setUseIncorrect} />
    </Form>
  );
}
