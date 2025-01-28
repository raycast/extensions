import { List, ActionPanel, Action, Icon, showToast, Toast } from "@raycast/api";
import { useCourseModules } from "./hooks/useCourseModules";

export default function CourseModules({ course }: { course: { name: string; id: string } }) {
  const { modules, isLoading, error } = useCourseModules(course.id);

  if (error) {
    showToast(Toast.Style.Failure, "Failed to fetch modules", error.message);
  }

  return (
    <List navigationTitle={`Modules for ${course.name}`} isLoading={isLoading}>
      {modules.map((module) => (
        <List.Section key={module.id} title={module.name}>
          {module.items.length > 0 ? (
            module.items.map((item) => (
              <List.Item
                key={item.id}
                title={item.title}
                icon={getIconForType(item.type)}
                actions={
                  <ActionPanel>
                    <Action.OpenInBrowser title="Open in Browser" url={item.htmlUrl} />
                    <Action.CopyToClipboard title="Copy Module Link" content={item.htmlUrl} />
                  </ActionPanel>
                }
              />
            ))
          ) : (
            <List.Item title="No items available" icon={Icon.Xmark} />
          )}
        </List.Section>
      ))}
    </List>
  );
}

/**
 * Get the appropriate icon based on the module item type.
 */
function getIconForType(type: string) {
  switch (type) {
    case "Assignment":
      return { source: Icon.Upload };
    case "Discussion":
      return { source: Icon.Bubble };
    case "File":
      return { source: Icon.Paperclip };
    case "Quiz":
      return { source: Icon.Pencil };
    case "Page":
      return { source: Icon.Document };
  }
}
