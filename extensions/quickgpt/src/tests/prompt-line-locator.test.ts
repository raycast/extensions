import * as hjson from "hjson";
import { assignPromptLineNumbers } from "../utils/prompt-line-locator";

const SAMPLE_FILE = `{
  prompts: [
    { title: "Ask"
      icon: "❓"
      subprompts: [
        { title: "Quick Question"
          content: "Answer briefly: {{i}}"
        }
        { title: "Deep Dive"
          content:
          '''
          Analyze the following topic in depth:
          {{s|c}}
          '''
        }
      ]
    }
    { title: "Read"
      icon: "📚"
    }
    {
      content:
      '''
      Summarize the article below
      {{c}}
      '''
    }
    { title: "Read"
      icon: "🔁"
    }
  ]
}`;

type RawPrompt = Record<string, unknown> & { lineNumber?: number; subprompts?: RawPrompt[] };

function parsePrompts(text: string): RawPrompt[] {
  const parsed = hjson.parse(text) as { prompts: RawPrompt[] };
  return parsed.prompts;
}

describe("assignPromptLineNumbers", () => {
  it("assigns line numbers to prompts and nested subprompts in document order", () => {
    const prompts = parsePrompts(SAMPLE_FILE);
    assignPromptLineNumbers(prompts, SAMPLE_FILE);

    expect(prompts[0].lineNumber).toBe(3); // Ask
    expect(prompts[0].subprompts?.[0].lineNumber).toBe(6); // Quick Question
    expect(prompts[0].subprompts?.[1].lineNumber).toBe(9); // Deep Dive
    expect(prompts[1].lineNumber).toBe(18); // first Read
  });

  it("locates untitled prompts through their first content line", () => {
    const prompts = parsePrompts(SAMPLE_FILE);
    assignPromptLineNumbers(prompts, SAMPLE_FILE);

    expect(prompts[2].lineNumber).toBe(24); // "Summarize the article below"
  });

  it("distinguishes duplicate titles by searching forward only", () => {
    const prompts = parsePrompts(SAMPLE_FILE);
    assignPromptLineNumbers(prompts, SAMPLE_FILE);

    expect(prompts[3].lineNumber).toBe(28); // second Read
    expect(prompts[3].lineNumber).not.toBe(prompts[1].lineNumber);
  });

  it("leaves prompts without a locatable definition untouched", () => {
    const prompts: RawPrompt[] = [{ title: "Not in file" }];
    assignPromptLineNumbers(prompts, SAMPLE_FILE);

    expect(prompts[0].lineNumber).toBeUndefined();
  });
});
