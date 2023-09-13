import OpenAI from "openai";

class OpenAIModule {
  private openai: OpenAI;

  constructor(apiKey: string) {
    this.openai = new OpenAI({ apiKey });
  }

  async summarizeArticle(url: string): Promise<string> {
    const prompt = `Please summarize the article and provide a only short summary with title with markdown. ${url}`;
    return await this.gptRequest(prompt);
  }

  private async gptRequest(prompt: string): Promise<string> {
    const response = await this.openai.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "gpt-3.5-turbo",
      temperature: 0.5,
    });

    let output = "";
    if (response.choices[0]?.message.content != null) {
      const regex = new RegExp(`^${'"'}|${'"'}$`, "g");
      output = response.choices[0].message.content.replace(regex, "");
    }
    return output;
  }
}

export { OpenAIModule };
