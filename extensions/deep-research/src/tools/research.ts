import fs from "fs";
import { environment } from "@raycast/api";

interface ThoughtData {
  thought: string;
  thoughtNumber: number;
  totalThoughts: number;
  nextThoughtNeeded: boolean;
  learnings: string[];
  questions: string[];
  goals: string[];
  toolsToUse: string[];
}

class SequentialThinkingServer {
  private thoughtHistory: ThoughtData[] = [];
  private path: string = "";

  constructor(p: string) {
    this.path = p;
  }

  private validateThoughtData(input: unknown): ThoughtData {
    const data = input as Record<string, unknown>;

    if (!data.thought || typeof data.thought !== "string") {
      throw new Error("Invalid thought: must be a string");
    }
    if (!data.thoughtNumber || typeof data.thoughtNumber !== "number") {
      throw new Error("Invalid thoughtNumber: must be a number");
    }
    if (!data.totalThoughts || typeof data.totalThoughts !== "number") {
      throw new Error("Invalid totalThoughts: must be a number");
    }
    if (typeof data.nextThoughtNeeded !== "boolean") {
      throw new Error("Invalid nextThoughtNeeded: must be a boolean");
    }

    return {
      thought: data.thought,
      thoughtNumber: data.thoughtNumber,
      totalThoughts: data.totalThoughts,
      nextThoughtNeeded: data.nextThoughtNeeded,
      learnings: data.learnings as string[],
      questions: data.questions as string[],
      goals: data.goals as string[],
      toolsToUse: data.toolsToUse as string[],
    };
  }

  private formatThought(thoughtData: ThoughtData): string {
    const { thoughtNumber, totalThoughts, thought, learnings, questions, goals } = thoughtData;

    let prefix = "";
    let context = "";

    prefix = "💭 Thought";
    context = "";

    const header = `${prefix} ${thoughtNumber}/${totalThoughts}${context}`;

    return `${header}\n\n${thought}\n${learnings}\n${questions}\n${goals}`;
  }

  public processThought(input: unknown): string {
    const validatedInput = this.validateThoughtData(input);

    if (validatedInput.thoughtNumber > validatedInput.totalThoughts) {
      validatedInput.totalThoughts = validatedInput.thoughtNumber;
    }

    this.thoughtHistory.push(validatedInput);

    const formattedThought = this.formatThought(validatedInput);
    process.stdout.write(formattedThought + "\n");

    fs.appendFileSync(this.path, JSON.stringify(validatedInput) + "\n");

    if (validatedInput.nextThoughtNeeded) {
      return (
        `Call one of the tools (${validatedInput.toolsToUse || []}). Then, continue your thought process by calling research again. ` +
        JSON.stringify({
          thoughtNumber: validatedInput.thoughtNumber,
          totalThoughts: validatedInput.totalThoughts,
          nextThoughtNeeded: true,
          thoughtHistoryLength: this.thoughtHistory.length,
          learnings: validatedInput.learnings || [],
          questions: validatedInput.questions || [],
          goals: validatedInput.goals || [],
        })
      );
    } else {
      return (
        "You have finished your research. Write a detailed report on what you have learned in Markdown syntax, following any requirements or restrictions the user has provided at the start. " +
        JSON.stringify({
          thoughtNumber: validatedInput.thoughtNumber,
          totalThoughts: validatedInput.totalThoughts,
          nextThoughtNeeded: false,
          thoughtHistoryLength: this.thoughtHistory.length,
          learnings: validatedInput.learnings || [],
          questions: validatedInput.questions || [],
          goals: validatedInput.goals || [],
        })
      );
    }
  }
}

/*
These parameters are required. They should be passed in as a JSON object, with the following fields:
- thought: string; Your current thinking step, such as analytical steps, questions about previous decisions, realizations about needing more analysis, changes in approach, hypothesis generation, hypothesis verification
- nextThoughtNeeded: boolean; Whether another thought step is needed; True if you need more thinking, even if at what seemed like the end
- thoughtNumber: number; Current number in sequence (can go beyond initial total if needed)
- totalThoughts: number; Current estimate of thoughts needed (can be adjusted up/down)
- goals: string[]; What the user wishes to achieve as a "large picture", be as specific as possible
- learnings: string[]; All the learnings you have made at every step. You should only add to these learnings, not remove existing ones. You should use these learnings to inform your next steps
- questions: string[]; All the questions you want to investigate at every step. You should refine these questions, changing them as you progress in your research
- id: string; A unique identifier for the thought process. This is used to store the thought process in a file. It should be unique to the thought process you are working on
- toolsToUse: string[]; A list of tools you want to use in your research. This is any tools that the user may initially have given you, or any tools you have access to. You cannot "make up" tools, you can only use the ones you have been given.
*/
export default async function (input: {
  thought: string;
  nextThoughtNeeded: boolean;
  thoughtNumber: number;
  totalThoughts: number;
  goals: string[];
  learnings: string[];
  questions: string[];
  id: string;
  toolsToUse: string[];
}) {
  const server = new SequentialThinkingServer(environment.supportPath + "/" + input.id + ".json");
  return server.processThought(input);
}
