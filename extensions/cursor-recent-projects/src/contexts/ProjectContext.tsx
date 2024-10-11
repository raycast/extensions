import { createContext, useContext, ReactNode } from "react";
import { open, showHUD } from "@raycast/api";
import { ensureCursorRulesFile, applyCursorRule } from "../integration";
import { runAppleScriptSync } from "run-applescript";

interface ProjectContextType {
  openProject: (uri: string, closeOtherWindows: boolean) => Promise<void>;
}

interface LaunchContext {
  ruleContent?: string;
  replace?: boolean;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export function ProjectProvider({ children, launchContext }: { children: ReactNode; launchContext?: LaunchContext }) {
  const openProject = async (uri: string, closeOtherWindows: boolean) => {
    try {
      if (closeOtherWindows) {
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
      await open(uri, "Cursor");

      if (launchContext?.ruleContent) {
        try {
          const projectDir = uri.split("file://").slice(1).join("/");
          await ensureCursorRulesFile(projectDir);
          await applyCursorRule(projectDir, launchContext.ruleContent, launchContext.replace ?? true);
        } catch (error) {
          console.error("Error applying cursor rules:", error);
          await showHUD("Failed to apply cursor rules");
        }
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
