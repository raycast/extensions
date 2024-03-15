import * as fs from "fs";
import * as path from "path";
import md5 from "md5";
import { getPreferenceValues } from "@raycast/api";

export type PromptProps = {
  identifier: string;
  title: string;
  content?: string;
  pattern?: string;
  icon?: string;
  subprompts?: PromptProps[];
  pinned?: boolean;
  prefixCMD?: string;
  noexplanation?: boolean;
  forbidChinese?: boolean;
};

class PromptManager {
  private promptsPaths: string[];
  private rootPrompts: PromptProps[];

  constructor() {
    const preferences = getPreferenceValues<Preferences>();
    this.promptsPaths = [
      ...(preferences.disableDefaultPrompts ? [] : [path.join(__dirname, "assets/prompts.json")]),
      ...(preferences.customPrompts ? [preferences.customPrompts] : []),
    ];
    this.rootPrompts = this.loadPrompts();
  }

  private loadPrompts() {
    let promptsData: PromptProps[] = [];
    for (const promptPath of this.promptsPaths) {
      const data = fs.readFileSync(promptPath, "utf-8");
      promptsData = [...promptsData, ...JSON.parse(data)];
    }
    const traverse = (prompts: PromptProps[]) => {
      for (const prompt of prompts) {
        if (!prompt.identifier) {
          prompt.identifier = md5(prompt.title);
        }
        if (prompt.subprompts) {
          traverse(prompt.subprompts);
        }
      }
    };
    traverse(promptsData);
    return promptsData;
  }

  public getRootPrompts() {
    return this.rootPrompts;
  }

  public traversePrompts(callback: (prompt: PromptProps) => void) {
    const traverse = (prompts: PromptProps[]) => {
      for (const prompt of prompts) {
        callback(prompt);
        if (prompt.subprompts) {
          traverse(prompt.subprompts);
        }
      }
    };
    traverse(this.rootPrompts);
  }

  public getFilteredPrompts(filter: (prompt: PromptProps) => boolean): PromptProps[] {
    const result: PromptProps[] = [];
    this.traversePrompts((prompt) => {
      if (filter(prompt)) {
        result.push(prompt);
      }
    });
    return result;
  }

  public findPrompt(filter: (prompt: PromptProps) => boolean): PromptProps | undefined {
    let result: PromptProps | undefined;
    this.traversePrompts((prompt) => {
      if (filter(prompt)) {
        result = prompt;
      }
    });
    return result;
  }
}

const promptManager = new PromptManager();

export default promptManager;
