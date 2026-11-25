import { createContext, useContext, ReactNode } from "react";
import { open, showHUD } from "@raycast/api";
import { fileURLToPath } from "url";
import { run } from "../integrations/cursor-directory";
import { runAppleScriptSync } from "run-applescript";
import { LaunchContext } from "../integrations/types";
import { callbackLaunchCommand } from "raycast-cross-extension";
import { closeCursorWindows, isWindows, openInCursor } from "../utils/windows";

interface ProjectContextType {
  openProject: (uri: string, closeOtherWindows: boolean) => Promise<void>;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export function ProjectProvider({ children, launchContext }: { children: ReactNode; launchContext?: LaunchContext }) {
  const openProject = async (uri: string, closeOtherWindows: boolean) => {
    try {
      if (closeOtherWindows) {
        if (isWindows) {
          await closeCursorWindows();
        } else {
          runAppleScriptSync(`
            tell application "System Events"
              tell process "Cursor"
                repeat while window 1 exists
                  click button 1 of window 1
                end repeat
              end tell
            end tell
            `);
        }
      }
      if (isWindows) {
        await openInCursor(fileURLToPath(uri));
      } else {
        await open(uri, "Cursor");
      }

      const { cursorDirectory, callbackLaunchOptions } = launchContext || {};

      if (cursorDirectory && cursorDirectory.ruleContent) {
        await run(uri, {
          ruleContent: cursorDirectory.ruleContent,
          replace: cursorDirectory.replace,
        });
      }
      if (callbackLaunchOptions) {
        callbackLaunchCommand(callbackLaunchOptions, {
          // TODO should be determined what we want to expose
          projectPath: fileURLToPath(uri),
        });
      }
    } catch (error) {
      console.error("Error opening project:", error);
      await showHUD("Failed to open project");
    }
  };

  return <ProjectContext.Provider value={{ openProject }}>{children}</ProjectContext.Provider>;
}

export function useProject() {
  const context = useContext(ProjectContext);
  if (context === undefined) {
    throw new Error("useProject must be used within a ProjectProvider");
  }
  return context;
}
