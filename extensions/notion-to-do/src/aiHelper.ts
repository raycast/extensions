import OpenAI from "openai";
import { getPreferenceValues, AI, environment } from "@raycast/api";
import { NotionTask, TaskPriority, TaskStatus, TaskTag, TaskEstimatedTime } from "./types";
import { format } from "date-fns";

interface Preferences {
  openaiApiKey?: string;
}

let openaiClient: OpenAI | null = null;

export function getOpenAIClient(): OpenAI | null {
  const preferences = getPreferenceValues<Preferences>();
  if (!preferences.openaiApiKey) {
    return null;
  }

  if (!openaiClient) {
    openaiClient = new OpenAI({
      apiKey: preferences.openaiApiKey,
    });
  }

  return openaiClient;
}

export function isAIEnabled(): boolean {
  // Raycast AI is available if user has Raycast Pro
  if (environment.canAccess(AI)) {
    return true;
  }

  // Fallback to OpenAI if user provided API key
  const preferences = getPreferenceValues<Preferences>();
  return !!preferences.openaiApiKey;
}

// Helper to use either Raycast AI or OpenAI
async function askAI(prompt: string, systemPrompt?: string): Promise<string> {
  // Try Raycast AI first (if user has Raycast Pro)
  if (environment.canAccess(AI)) {
    try {
      const fullPrompt = systemPrompt ? `${systemPrompt}\n\n${prompt}` : prompt;
      const response = await AI.ask(fullPrompt, {
        creativity: "medium",
        model: AI.Model["OpenAI_GPT4o-mini"],
      });
      return response;
    } catch (error) {
      console.error("Raycast AI error, falling back to OpenAI:", error);
      // Fall through to OpenAI
    }
  }

  // Fallback to OpenAI
  const client = getOpenAIClient();
  if (!client) {
    throw new Error("AI not available. Please enable Raycast Pro or add your OpenAI API key in settings.");
  }

  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = systemPrompt
    ? [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt },
      ]
    : [{ role: "user", content: prompt }];

  const completion = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages,
    response_format: { type: "json_object" },
    temperature: 0.7,
  });

  return completion.choices[0].message.content || "{}";
}

// Parse natural language task description
export interface ParsedTaskSuggestion {
  name: string;
  project?: string;
  priority?: TaskPriority;
  estimatedTime?: TaskEstimatedTime;
  tags?: TaskTag[];
  dueDate?: Date;
  description?: string;
}

export async function parseNaturalLanguageTask(input: string): Promise<ParsedTaskSuggestion> {
  const systemPrompt = `You are a task parsing assistant. Extract task details from natural language input.
Return a JSON object with these fields (all optional except name):
- name: task title (required)
- project: project name (Obsidian, Productivity, PatternedAI, Personal, Health, Finance, Learning, Home, Work, Social, Travel, Other)
- priority: Critical, High, Medium, or Low
- estimatedTime: "15 min", "30 min", "1 hour", "2 hours", "4 hours", "1 day", "2-3 days", or "1 week+"
- tags: array of tags (Design, Development, Research, Planning, Review, Meeting, Writing, Bug, Feature, Documentation, Testing, Deployment)
- dueDate: ISO date string if mentioned
- description: additional context if provided

Examples:
Input: "Review design system by Friday"
Output: {"name":"Review design system","priority":"High","tags":["Design","Review"],"dueDate":"2025-01-17","estimatedTime":"2 hours"}

Input: "Fix critical bug in payment flow ASAP"
Output: {"name":"Fix bug in payment flow","priority":"Critical","tags":["Bug","Development"],"estimatedTime":"4 hours"}`;

  const response = await askAI(input, systemPrompt);
  const result = JSON.parse(response);

  return {
    name: result.name || input,
    project: result.project,
    priority: result.priority,
    estimatedTime: result.estimatedTime,
    tags: result.tags,
    dueDate: result.dueDate ? new Date(result.dueDate) : undefined,
    description: result.description,
  };
}

// Break down a task into subtasks
export interface Subtask {
  name: string;
  estimatedTime?: TaskEstimatedTime;
  description?: string;
}

export async function breakdownTask(taskName: string, taskDescription?: string): Promise<Subtask[]> {
  const taskInfo = taskDescription ? `${taskName}\n\nContext: ${taskDescription}` : taskName;

  const systemPrompt = `You are a task breakdown assistant. Break down complex tasks into smaller, actionable subtasks.
Return a JSON array of subtasks with these fields:
- name: subtask title (required)
- estimatedTime: "15 min", "30 min", "1 hour", "2 hours", "4 hours" (optional)
- description: brief context if needed (optional)

Make subtasks specific, actionable, and in logical order. Aim for 3-7 subtasks.`;

  const response = await askAI(`Break down this task: ${taskInfo}`, systemPrompt);
  const result = JSON.parse(response);
  return result.subtasks || result.tasks || [];
}

// Suggest daily priorities
export interface PrioritySuggestion {
  task: NotionTask;
  reason: string;
  suggestedOrder: number;
}

export async function suggestDailyPriorities(tasks: NotionTask[]): Promise<PrioritySuggestion[]> {
  // Filter to relevant tasks (not done, not blocked)
  const relevantTasks = tasks.filter((t) => t.Status !== "Done" && t.Status !== "Blocked");

  if (relevantTasks.length === 0) {
    return [];
  }

  const tasksInfo = relevantTasks.map((t, idx) => ({
    id: idx,
    name: t.Name,
    status: t.Status,
    priority: t.Priority,
    dueDate: t["Due Date"],
    energyLevel: t["Energy Level"],
    estimatedTime: t["Estimated Time"],
    project: t.Project,
  }));

  const systemPrompt = `You are a task prioritization assistant. Analyze tasks and suggest the top priorities for today.
Consider:
- Due dates (urgent = due today or overdue)
- Priority levels
- Energy requirements
- Time estimates
- Task dependencies

Return a JSON array of the top 5 priority tasks with:
- id: task ID from input (required)
- reason: why this task should be prioritized (required)
- suggestedOrder: 1-5 ranking (required)

Today is ${format(new Date(), "yyyy-MM-dd")}.`;

  const response = await askAI(`Prioritize these tasks:\n${JSON.stringify(tasksInfo, null, 2)}`, systemPrompt);

  interface PriorityResponse {
    id: number;
    reason: string;
    suggestedOrder: number;
  }

  const result = JSON.parse(response);
  const priorities: PriorityResponse[] = result.priorities || result.suggestions || [];

  return priorities.map((p) => ({
    task: relevantTasks[p.id],
    reason: p.reason,
    suggestedOrder: p.suggestedOrder,
  }));
}

// Natural language search
export interface SearchFilters {
  status?: TaskStatus[];
  priority?: TaskPriority[];
  tags?: TaskTag[];
  project?: string;
  searchText?: string;
}

export async function parseNaturalLanguageSearch(query: string): Promise<SearchFilters> {
  const systemPrompt = `You are a search query parser. Convert natural language queries into structured search filters.
Return a JSON object with these optional fields:
- status: array of statuses (Backlog, To-do, Blocked, In progress, Done)
- priority: array of priorities (Critical, High, Medium, Low)
- tags: array of tags (Design, Development, Research, Planning, Review, Meeting, Writing, Bug, Feature, Documentation, Testing, Deployment)
- project: project name
- searchText: general search terms

Examples:
Input: "Find all my blocked design tasks"
Output: {"status":["Blocked"],"tags":["Design"]}

Input: "Show high priority bugs"
Output: {"priority":["High"],"tags":["Bug"]}`;

  const response = await askAI(query, systemPrompt);
  const result = JSON.parse(response);
  return result;
}

// Generate task summary
export interface TaskSummaryOptions {
  period: "day" | "week" | "month";
  format: "standup" | "detailed" | "bullet";
}

export async function generateTaskSummary(tasks: NotionTask[], options: TaskSummaryOptions): Promise<string> {
  const tasksInfo = tasks.map((t) => ({
    name: t.Name,
    status: t.Status,
    project: t.Project,
    completedTime: t.lastEditedTime,
  }));

  const formatPrompts = {
    standup: "Format as a standup update (Yesterday/Today/Blockers)",
    detailed: "Format as a detailed work report with accomplishments and metrics",
    bullet: "Format as concise bullet points",
  };

  const systemPrompt = `You are a task summary assistant. Generate a professional summary of completed work.
${formatPrompts[options.format]}

Focus on accomplishments, group by project if relevant, and highlight key achievements.`;

  const prompt = `Generate a ${options.period}ly summary for these completed tasks:\n${JSON.stringify(tasksInfo, null, 2)}`;
  const response = await askAI(prompt, systemPrompt);

  return response || "No summary available";
}
