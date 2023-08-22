import OpenAI from "openai";

class OpenAIModule {
  private openai: OpenAI;

  constructor(apiKey: string) {
    this.openai = new OpenAI({ apiKey });
  }

  async fixGrammer(inputText: string): Promise<string> {
    const prompt = `The following text has grammar mistakes. Please correct it: "${inputText}" and return only corrected version without any context`;
    return await this.gptRequest(prompt);
  }

  async correctGrammer(inputText: string): Promise<string> {
    const prompt = `Please rewrite this sentence: "${inputText}" and return only rewrited version without any context`;
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
