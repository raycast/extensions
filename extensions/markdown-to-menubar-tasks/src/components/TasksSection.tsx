import { Icon, MenuBarExtra, open } from "@raycast/api";
import { Task, TaskSection } from "../services/markdown";
import { getPreferenceValues } from "@raycast/api";

interface Preferences {
  markdownFilePath: string;
}

type TasksSectionProps = {
  sections: TaskSection[];
  isLoading: boolean;
  onTaskClick: (task: Task) => void;
};

export function TasksSection({ sections, isLoading, onTaskClick }: TasksSectionProps) {
  const preferences = getPreferenceValues<Preferences>();
  const filePath = preferences.markdownFilePath;

  const totalTasks = sections.reduce((sum, section) => sum + section.tasks.length, 0);
  const completedTasks = sections.reduce((sum, section) => sum + section.tasks.filter((t) => t.isCompleted).length, 0);

  // Function to open the markdown file
  const openMarkdownFile = () => {
    open(filePath);
  };

  if (totalTasks === 0) {
    return <MenuBarExtra.Item title="No tasks found" onAction={openMarkdownFile} />;
  }

  if (isLoading) {
    return <MenuBarExtra.Item title="Loading tasks..." />;
  }

  return (
    <MenuBarExtra.Section>
      <MenuBarExtra.Item title={`✨ ${completedTasks}/${totalTasks} completed!!`} onAction={openMarkdownFile} />
      {sections.map((section, sectionIndex) => (
        <MenuBarExtra.Section key={section.title}>
          {sectionIndex > 0 && <MenuBarExtra.Separator />}
          <MenuBarExtra.Item title={`${section.title}`} onAction={openMarkdownFile} />
          <MenuBarExtra.Separator />
          {section.tasks.map((task, taskIndex) => {
            // Check if the task contains a markdown link
            const markdownLinkMatch = task.text.match(/\[(.*?)\]\((https?:\/\/[^\s)]+)\)/);
            let displayTitle = task.text;

            // Special handling for tasks with links:
            // 1. Display as a submenu
            // 2. Show link text with a minimal but meaningful icon
            // 3. Provide options to open the link or toggle task status
            if (markdownLinkMatch) {
              const [fullMatch, linkText] = markdownLinkMatch;
              const beforeLink = task.text.substring(0, task.text.indexOf(fullMatch));
              const afterLink = task.text.substring(task.text.indexOf(fullMatch) + fullMatch.length);
              displayTitle = `${beforeLink}↗ ${linkText}${afterLink}`;

              return (
                <MenuBarExtra.Submenu
                  key={`${section.title}-${taskIndex}`}
                  title={displayTitle}
                  icon={task.isCompleted ? Icon.CheckCircle : Icon.Circle}
                >
                  <MenuBarExtra.Item title="Open Link" icon={Icon.Link} onAction={() => open(markdownLinkMatch[2])} />
                  <MenuBarExtra.Item
                    title={task.isCompleted ? "Mark as Incomplete" : "Mark as Complete"}
                    icon={task.isCompleted ? Icon.Circle : Icon.CheckCircle}
                    onAction={() => onTaskClick(task)}
                  />
                </MenuBarExtra.Submenu>
              );
            }

            // Standard rendering for tasks without links
            return (
              <MenuBarExtra.Item
                key={`${section.title}-${taskIndex}`}
                title={displayTitle}
                icon={task.isCompleted ? Icon.CheckCircle : Icon.Circle}
                onAction={() => onTaskClick(task)}
              />
            );
          })}
        </MenuBarExtra.Section>
      ))}
    </MenuBarExtra.Section>
  );
}
