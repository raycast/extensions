import { Client } from "@notionhq/client";
import { getPreferenceValues } from "@raycast/api";
import { NotionTask, TaskStatus, TaskPriority, TaskProgress, CreateTaskFormValues } from "./types";
import { format, startOfDay } from "date-fns";
import { markdownToNotionBlocks } from "./markdownToNotion";

interface Preferences {
  notionApiKey: string;
  notionDatabaseId: string;
}

let notionClient: Client | null = null;
let databaseId: string | null = null;

export function getNotionClient(): { client: Client; databaseId: string } {
  if (!notionClient || !databaseId) {
    const preferences = getPreferenceValues<Preferences>();
    notionClient = new Client({ auth: preferences.notionApiKey });
    databaseId = preferences.notionDatabaseId;
  }
  return { client: notionClient, databaseId };
}

interface NotionRichText {
  plain_text: string;
}

interface NotionSelect {
  name: string;
}

interface NotionDate {
  start: string;
}

interface NotionRelation {
  id: string;
}

// Helper function to extract plain text from Notion rich text
function getRichTextValue(richText: NotionRichText[]): string {
  if (!richText || richText.length === 0) return "";
  return richText.map((text) => text.plain_text).join("");
}

// Helper function to get select value
function getSelectValue(select: NotionSelect | null): string | undefined {
  return select?.name;
}

// Helper function to get multi-select values
function getMultiSelectValue(multiSelect: NotionSelect[]): string[] {
  if (!multiSelect) return [];
  return multiSelect.map((item) => item.name);
}

// Helper function to get date value
function getDateValue(date: NotionDate | null): string | undefined {
  return date?.start;
}

// Helper function to get URL value
function getUrlValue(url: string | null): string | undefined {
  return url || undefined;
}

// Helper function to get relation IDs
function getRelationIds(relation: NotionRelation[]): string[] {
  if (!relation) return [];
  return relation.map((item) => item.id);
}

interface NotionPage {
  id: string;
  url: string;
  last_edited_time: string;
  properties: Record<string, unknown>;
}

// Convert Notion page to NotionTask
function pageToTask(page: NotionPage): NotionTask {
  const props = page.properties;

  return {
    id: page.id,
    url: page.url,
    Name: getRichTextValue(props.Name?.title || []),
    Status: (getSelectValue(props.Status?.status) as TaskStatus) || "To-do",
    Priority: getSelectValue(props.Priority?.select) as TaskPriority | undefined,
    "Due Date": getDateValue(props["Due Date"]?.date),
    Planned: getDateValue(props["Planned "]?.date),
    Project: getSelectValue(props.Project?.select),
    Tags: getMultiSelectValue(props.Tags?.multi_select || []),
    "Estimated Time": getSelectValue(props["Estimated Time"]?.select),
    "Energy Level": getSelectValue(props["Energy Level"]?.select),
    Progress: getSelectValue(props.Progress?.select) as TaskProgress | undefined,
    Urgency: getSelectValue(props.Urgency?.select),
    Importance: getSelectValue(props.Importance?.select),
    Link: getUrlValue(props.Link?.url),
    "Blocked by": getRelationIds(props["Blocked by "]?.relation || []),
    lastEditedTime: page.last_edited_time,
  };
}

// Create a new task
export async function createTask(values: CreateTaskFormValues): Promise<NotionTask> {
  const { client, databaseId } = getNotionClient();

  const properties: Record<string, unknown> = {
    Name: {
      title: [
        {
          text: {
            content: values.name,
          },
        },
      ],
    },
    Status: {
      status: {
        name: values.status || "To-do",
      },
    },
  };

  // Add optional properties
  if (values.priority) {
    properties.Priority = {
      select: {
        name: values.priority,
      },
    };
  }

  if (values.dueDate) {
    properties["Due Date"] = {
      date: {
        start: format(values.dueDate, "yyyy-MM-dd"),
      },
    };
  }

  if (values.planned) {
    properties["Planned "] = {
      date: {
        start: format(values.planned, "yyyy-MM-dd"),
      },
    };
  }

  if (values.project && values.project.trim() !== "") {
    properties.Project = {
      select: {
        name: values.project.trim(),
      },
    };
  }

  if (values.tags && values.tags.length > 0) {
    properties.Tags = {
      multi_select: values.tags.map((tag) => ({ name: tag })),
    };
  }

  if (values.estimatedTime) {
    properties["Estimated Time"] = {
      select: {
        name: values.estimatedTime,
      },
    };
  }

  if (values.energyLevel) {
    properties["Energy Level"] = {
      select: {
        name: values.energyLevel,
      },
    };
  }

  if (values.urgency) {
    properties.Urgency = {
      select: {
        name: values.urgency,
      },
    };
  }

  if (values.importance) {
    properties.Importance = {
      select: {
        name: values.importance,
      },
    };
  }

  if (values.link) {
    properties.Link = {
      url: values.link,
    };
  }

  // Build page content (description) - convert markdown to Notion blocks
  const children = [];
  if (values.description && values.description.trim() !== "") {
    const blocks = markdownToNotionBlocks(values.description);
    children.push(...blocks);
  }

  const response = await client.pages.create({
    parent: { database_id: databaseId },
    properties,
    children: children.length > 0 ? children : undefined,
  });

  return pageToTask(response as NotionPage);
}

// Query tasks from database
export async function queryTasks(filter?: Record<string, unknown>, sorts?: unknown[]): Promise<NotionTask[]> {
  const { client, databaseId } = getNotionClient();

  const response = await client.databases.query({
    database_id: databaseId,
    filter,
    sorts,
  });

  return response.results.map((page) => pageToTask(page as NotionPage));
}

// Get all tasks
export async function getAllTasks(): Promise<NotionTask[]> {
  return queryTasks(undefined, [{ property: "Due Date", direction: "ascending" }]);
}

// Search tasks by name
export async function searchTasks(searchTerm: string): Promise<NotionTask[]> {
  const { client, databaseId } = getNotionClient();

  const response = await client.databases.query({
    database_id: databaseId,
    filter: {
      property: "Name",
      title: {
        contains: searchTerm,
      },
    },
  });

  return response.results.map((page) => pageToTask(page));
}

// Update task properties
export async function updateTask(
  taskId: string,
  updates: {
    status?: TaskStatus;
    priority?: TaskPriority;
    progress?: TaskProgress;
    dueDate?: Date;
    planned?: Date;
  },
): Promise<NotionTask> {
  const { client } = getNotionClient();

  const properties: Record<string, unknown> = {};

  if (updates.status) {
    properties.Status = {
      status: {
        name: updates.status,
      },
    };
  }

  if (updates.priority) {
    properties.Priority = {
      select: {
        name: updates.priority,
      },
    };
  }

  if (updates.progress) {
    properties.Progress = {
      select: {
        name: updates.progress,
      },
    };
  }

  if (updates.dueDate) {
    properties["Due Date"] = {
      date: {
        start: format(updates.dueDate, "yyyy-MM-dd"),
      },
    };
  }

  if (updates.planned) {
    properties["Planned "] = {
      date: {
        start: format(updates.planned, "yyyy-MM-dd"),
      },
    };
  }

  const response = await client.pages.update({
    page_id: taskId,
    properties,
  });

  return pageToTask(response as NotionPage);
}

// Get today's tasks (due today or planned for today)
export async function getTodaysTasks(): Promise<NotionTask[]> {
  const today = format(new Date(), "yyyy-MM-dd");

  const tasks = await queryTasks(
    {
      or: [
        {
          property: "Due Date",
          date: {
            equals: today,
          },
        },
        {
          property: "Planned ",
          date: {
            equals: today,
          },
        },
      ],
    },
    [{ property: "Priority", direction: "ascending" }],
  );

  return tasks;
}

// Get in progress tasks
export async function getInProgressTasks(): Promise<NotionTask[]> {
  return queryTasks(
    {
      property: "Status",
      status: {
        equals: "In progress",
      },
    },
    [{ timestamp: "last_edited_time", direction: "descending" }],
  );
}

// Get blocked tasks
export async function getBlockedTasks(): Promise<NotionTask[]> {
  return queryTasks({
    property: "Status",
    status: {
      equals: "Blocked",
    },
  });
}

// Get overdue tasks
export async function getOverdueTasks(): Promise<NotionTask[]> {
  const today = format(new Date(), "yyyy-MM-dd");

  return queryTasks({
    and: [
      {
        property: "Due Date",
        date: {
          before: today,
        },
      },
      {
        property: "Status",
        status: {
          does_not_equal: "Done",
        },
      },
    ],
  });
}

// Get completed tasks from today
export async function getCompletedTodayTasks(): Promise<NotionTask[]> {
  const todayStart = startOfDay(new Date()).toISOString();

  return queryTasks({
    and: [
      {
        property: "Status",
        status: {
          equals: "Done",
        },
      },
      {
        timestamp: "last_edited_time",
        last_edited_time: {
          on_or_after: todayStart,
        },
      },
    ],
  });
}

// Get all unique project names from the database
export async function getAllProjects(): Promise<string[]> {
  const { client, databaseId } = getNotionClient();

  try {
    // Get the database to retrieve the Project property options
    const database = await client.databases.retrieve({ database_id: databaseId });
    const projectProperty = database.properties.Project;

    if (projectProperty && projectProperty.type === "select" && projectProperty.select.options) {
      return projectProperty.select.options.map((option) => option.name).filter(Boolean);
    }

    return [];
  } catch (error) {
    console.error("Error fetching projects:", error);
    return [];
  }
}
