import { Action, ActionPanel, Detail, LocalStorage } from "@raycast/api"
import { useEffect, useState } from "react"
import { Question } from "./types"
const hash = {
    0: 1, // 1
    1: 2, // 2
    2: 4, 
    3: 8,
    4: 10,
    5: -1,
}
export default function DailyQuestion () {
    const [questions, setQuestions] = useState<Question[]>()
    const [currentQuestion, setCurrentQuestion] = useState<number>(0)
    const [showAnswer, setShowAnswer] = useState<boolean>(false)
    const today = new Date()
    useEffect(() => {
        const fetchData = async () => {
            const stringifyRes = await LocalStorage.allItems<Question>()
            const res = Object.entries(stringifyRes).map(entry =>{
                const data =JSON.parse(entry[1])
                return data
            }).filter(entry => {

                const dayBetween = Math.round(
                    (today.getTime() - new Date(entry.date).getTime()) / (1000 * 60 * 60 * 24)
                )

                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                //@ts-ignore
                return hash[entry.box] == dayBetween;
            })
            setQuestions(res)
        }
        fetchData()

    }, [])
    const handleTrue = async () => {
        if(!questions || !questions[currentQuestion]) return ;
        const data = questions[currentQuestion]
        data.box += 1
        await LocalStorage.setItem(data.id, JSON.stringify(data))
        setCurrentQuestion( currentQuestion + 1)
        setShowAnswer(false)
    }

    if(questions && questions[currentQuestion]){
        const markdown = `
# Question n ${currentQuestion + 1}  /  ${questions.length}


## ${questions[currentQuestion].question}

`;

const answerMarkdown = `## ${questions[currentQuestion].answer}`

        return (
            <>
            <Detail  
                markdown={showAnswer ? markdown + answerMarkdown : markdown}
                actions={
                    <ActionPanel>
                        <Action title="False" onAction={() => setCurrentQuestion(currentQuestion + 1)}/>
                        <Action title="True" onAction={() => handleTrue()}/>
                        <Action title="Answer" onAction={() => setShowAnswer(!showAnswer)} shortcut={{modifiers: ["cmd"], key: "c"}}/>

                    </ActionPanel>
                }
            />
            </>
        )
    }else {
        return (<Detail markdown={"## You have no questions remaining for today"}/>)
    }
}