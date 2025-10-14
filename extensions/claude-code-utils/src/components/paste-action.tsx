import { Action, Application, getFrontmostApplication } from "@raycast/api";
import { useEffect, useState } from "react";

interface PasteActionProps {
  content: string;
}

/**
 * Reusable paste action component that pastes content to the frontmost application.
 * Displays the app name and icon when available.
 */
export function PasteAction({ content }: PasteActionProps) {
  const [frontmostApp, setFrontmostApp] = useState<Application>();

  useEffect(() => {
    getFrontmostApplication()
      .then((app) => {
        setFrontmostApp(app);
      })
      .catch(() => {
        // Silently fail - component will show fallback title
      });
  }, []);

  return (
    <Action.Paste
      title={
        frontmostApp?.name
          ? `Paste to ${frontmostApp.name}`
          : "Paste to Active App"
      }
      content={content}
      {...(frontmostApp?.path && {
        icon: { fileIcon: frontmostApp.path },
      })}
    />
  );
}
