import OpenAI from "openai";
import { Explanation } from "./types";

export async function getPaperExplanation(openai_key: string, abstract: string): Promise<Explanation[]> {
  const openai = new OpenAI({
    apiKey: openai_key,
  });

  const EXPLANATION_PROMPT = `You are an expert machine learning engineer and a brilliant teacher. Given an abstract of a paper, provide a list of confusing terminology introduced in the abstract and provide a brief explanation for each. Make your explanations clear so a novice machine learning researcher can understand.
    Your output should be a list object in the following format: 
    [{"title": "Data attribution", "explanation": "This is the process of determining which parts of the training data contributed to a specific prediction made by a model. In simpler terms, it's like asking, "which data points influenced this particular prediction?"}]

    ABSTRACT:
    ${abstract}

    RESPONSE:`;

  const completion = await openai.chat.completions.create({
    messages: [{ role: "user", content: EXPLANATION_PROMPT }],
    model: "gpt-3.5-turbo",
    max_tokens: 700,
    temperature: 0.1,
  });

  const responseText = completion.choices[0].message.content;
  if (!responseText) {
    return [];
  } else {
    return JSON.parse(responseText) as Explanation[];
  }
}
