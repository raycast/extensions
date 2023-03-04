import { Configuration, OpenAIApi } from "openai";
import {getPreferenceValues } from "@raycast/api";
import {ChatResponse, Preferences} from "./type";

export async function fetchChatResponse(prompt: string): Promise<string> {
    const preferences: Preferences = getPreferenceValues();
    const configuration = new Configuration({
        apiKey: preferences.openaiApiToken
    });
    const openai = new OpenAIApi(configuration);
    const completion = await openai.createChatCompletion({
        model: "gpt-3.5-turbo",
        messages: [{role: "user", content: prompt}],
    });
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const responseData: ChatResponse = completion.data;
    return responseData.choices[0].message.content;
}

