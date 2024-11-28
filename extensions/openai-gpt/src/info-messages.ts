export const temperature = `What sampling temperature to use. Higher values means the model will take more risks. Try 0.9 for more creative applications, and 0 (argmax sampling) for ones with a well-defined answer.

We generally recommend altering this or top_p but not both.

Default: 0.7`;

export const model = `The model which will generate the completion. Some models are more sutiable for certain tasks than others. "gpt-4-0125-preview" is the most powerful one, but "gpt-3.5-turbo-0125" is cheaper, faster, and almost as capable`;

export const maxTokens = `The maximum number of tokens to generate in the completion.

The token count of your prompt plus this parameter cannot exceed the model's context length. Please consult OpenAI documentation for the token limits.

Default: 256`;

export const topP = `An alternative to sampling with temperature, called nucleus sampling, where the model considers the results of the tokens with top_p probability mass. So 0.1 means only the tokens comprising the top 10% probability mass are considered.

We generally recommend altering this or "temperature" but not both.

Default: 1`;

export const frequencyPenalty = `Number between -2.0 and 2.0. Positive values penalize new tokens based on their existing frequency in the text so far, decreasing the model's likelihood to repeat the same line verbatim.

Default: 0`;

export const presencePenalty = `Number between -2.0 and 2.0. Positive values penalize new tokens based on whether they appear in the text so far, increasing the model's likelihood to talk about new topics.

Default: 0`;
