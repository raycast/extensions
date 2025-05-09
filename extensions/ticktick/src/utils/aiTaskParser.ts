import { AI } from "@raycast/api";
import * as chrono from "chrono-node";
import moment from "moment-timezone";
import { getProjects } from "../service/project";
import { formatToServerDate } from "./date";

export interface ParsedTask {
  title: string;
  description?: string;
  projectId?: string;
  dueDate?: string;
  isAllDay: boolean;
  priority?: string;
}

const priorityMap = {
  high: "3",
  medium: "2",
  low: "1",
};

export async function parseTaskWithAI(text: string): Promise<ParsedTask> {
  const today = moment().format("YYYY-MM-DD");
  const currentTime = moment().format("HH:mm");
  const tomorrow = moment().add(1, "day").format("YYYY-MM-DD");
  const nextMonday = moment().day(8).format("YYYY-MM-DD");
  const friday = moment().day(5).format("YYYY-MM-DD");
  const saturday = moment().day(6).format("YYYY-MM-DD");

  // Get all projects
  const projects = await getProjects();
  const projectsList = projects.map((project) => `${project.name}:${project.id}`).join(", ");

  const prompt = `As a task parser, parse the natural language input into structured task data. Please return a parseable JSON object.

JSON Object Structure:
{
  "title": <task title>,
  "description": <task description. Use relative dates to describe task details. Include task name, project (if any), priority (if any), and time information>,
  "projectId": <project ID, select from the following list: ${projectsList}. If no project specified, omit this field>,
  "dueDate": <due date. Use local timezone, format as YYYY-MM-DDTHH:mm:ss.SSSZZ>,
  "isAllDay": <whether it's an all-day task. false if specific time is specified, true otherwise>,
  "priority": <priority. 1:low, 2:medium, 3:high. Use 3 when task contains "urgent", "important", "high priority" or exclamation mark>
}

Rules:
- Must return a valid, parseable JSON object
- Title should include all words that can't be parsed as other attributes
- Today is ${today}, current time is ${currentTime}
- "morning" defaults to "08:00", "afternoon" to "14:00", "evening" to "20:00"
- "this week" refers to current week, "next week" starts from next Monday (${nextMonday})
- Weekend starts from Saturday (${saturday})
- If specified time is earlier than current time and no date specified, assume tomorrow
- Project names can use # or @ symbol (e.g., #work or @work)
- All times should use local timezone

Examples:
- reply email: {"title":"reply email","isAllDay":true}
- buy tickets today: {"title":"buy tickets","dueDate":"${today}","isAllDay":true,"description":"Complete 'buy tickets' today"}
- clean room tonight: {"title":"clean room","dueDate":"${today}T20:00:00.000+08:00","isAllDay":false,"description":"Complete 'clean room' tonight at 20:00"}
- meeting tomorrow afternoon: {"title":"meeting","dueDate":"${tomorrow}T14:00:00.000+08:00","isAllDay":false,"description":"'meeting' tomorrow afternoon at 14:00"}
- review on Friday!: {"title":"review","dueDate":"${friday}","isAllDay":true,"priority":"3","description":"Complete 'review' on Friday (high priority)"}
- #work prepare report: {"title":"prepare report","projectId":"<corresponding project ID>","isAllDay":true,"description":"Complete 'prepare report' in 'work' project"}

Input text: "${text}"`;

  const maxRetries = 3;
  for (let i = 0; i < maxRetries; i++) {
    try {
      const result = await AI.ask(prompt);
      const jsonMatch = result.match(/[{\\[]{1}([,:{}\\[\]0-9.\-+Eaeflnr-u \n\r\t]|".*?")+[}\]]{1}/gis)?.[0];

      if (!jsonMatch) {
        throw new Error("Invalid AI response");
      }

      const aiResult = JSON.parse(jsonMatch.trim());

      // If AI fails to parse date, try using chrono-node
      if (!aiResult.dueDate) {
        const dateMatch = chrono.parse(text);
        if (dateMatch && dateMatch.length > 0) {
          const chronoDate = dateMatch[0].start;
          const isDateTime = chronoDate.isCertain("hour") || chronoDate.isCertain("minute");
          const date = chronoDate.date();
          aiResult.isAllDay = !isDateTime;
          aiResult.dueDate = formatToServerDate(date);
        }
      }

      // Handle priority mapping
      if (aiResult.priority && priorityMap[aiResult.priority as keyof typeof priorityMap]) {
        aiResult.priority = priorityMap[aiResult.priority as keyof typeof priorityMap];
      }

      return aiResult;
    } catch (error) {
      console.log(`Retrying AI call. Attempt: ${i + 1}`);
      if (i === maxRetries - 1) {
        throw new Error("Failed to get valid AI response");
      }
    }
  }

  throw new Error("Maximum retry attempts reached");
}
