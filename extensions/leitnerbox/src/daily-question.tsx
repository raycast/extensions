import { Action, ActionPanel, Detail, LocalStorage } from "@raycast/api";
import { useEffect, useState } from "react";
import { Question, ObjDays } from "./types";

const hashMap = {
  0: 1, // 1
  1: 2, // 2
  2: 4,
  3: 8,
  4: 10,
  5: -1,
};
export default function DailyQuestion() {
  const [questions, setQuestions] = useState<Question[]>();
  const [currentQuestion, setCurrentQuestion] = useState<number>(0);
  const [showAnswer, setShowAnswer] = useState<boolean>(false);
  const [questionInDays, setQuestionInDays] = useState<ObjDays>({});
  const today = new Date();

  useEffect(() => {
    const fetchData = async () => {
      const objDays: ObjDays = {};
      const stringifyRes = await LocalStorage.allItems<Question>();
      const res = Object.entries(stringifyRes)
        .map((entry) => {
          const data = JSON.parse(entry[1]);
          return data;
        })
        .filter((entry) => {
          // filter the question with the hashMap and corresponding days
          const dayBetween = Math.round((today.getTime() - new Date(entry.date).getTime()) / (1000 * 60 * 60 * 24));

          //@ts-expect-error because ts think entry.box is undefined
          const dayBeforeAnswering = dayBetween + hashMap[entry.box];
          if (dayBeforeAnswering in objDays) {
            objDays[dayBeforeAnswering] += 1;
          } else {
            objDays[dayBeforeAnswering] = 1;
          }
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          //@ts-ignore
          return hashMap[entry.box] <= dayBetween;
        });
      setQuestions(res);
      setQuestionInDays(objDays);
    };
    fetchData();
  }, []);

  const handleRes = async (res: boolean) => {
    if (!questions || !questions[currentQuestion]) return;
    const data = questions[currentQuestion];

    if (res === true) {
      data.box += 1;
    } else if (data.box > 0) {
      data.box -= 1;
    }

    // update the date to wait the nbr of days of the current box
    // ex: if he pass from box 1 to 2 now he have to wait 4 days
    data.date = today;

    // update the corresponding data in local Storage
    await LocalStorage.setItem(data.id, JSON.stringify(data));

    // go to the next question and hide the answer field
    setCurrentQuestion(currentQuestion + 1);
    setShowAnswer(false);
  };

  if (questions && questions[currentQuestion]) {
    const markdown = `
# Question n ${currentQuestion + 1}  /  ${questions.length}


## ${questions[currentQuestion].question}

`;

    const answerMarkdown = `## ${questions[currentQuestion].answer}`;

    return (
      <>
        <Detail
          markdown={showAnswer ? markdown + answerMarkdown : markdown}
          actions={
            <ActionPanel>
              <Action title="False" onAction={() => handleRes(false)} />
              <Action title="True" onAction={() => handleRes(true)} />
              <Action
                title="Answer"
                onAction={() => setShowAnswer(!showAnswer)}
                shortcut={{ modifiers: ["cmd"], key: "c" }}
              />
            </ActionPanel>
          }
        />
      </>
    );
  } else {
    let text: string = "";
    if (Object.keys(questionInDays).length === 0) {
      text = "You don't have any questions, think about creating one";
    } else {
      text = `\n You will have \n`;
      Object.entries(questionInDays).forEach(([key, value]) => {
        text += `- ${value} questions in ${key} days \n`;
      });
    }
    const markdown = `## You don't have any questions for today \n
        ${text} 
    `;
    return <Detail markdown={markdown} />;
  }
}
