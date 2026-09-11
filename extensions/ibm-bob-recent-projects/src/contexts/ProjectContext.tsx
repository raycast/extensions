import { open, showHUD } from "@raycast/api";
import { callbackLaunchCommand } from "raycast-cross-extension";
import { createContext, ReactNode, useContext } from "react";
import { runAppleScriptSync } from "run-applescript";
import { LaunchContext } from "../integrations/types";

interface ProjectContextType {
  openProject: (uri: string, closeOtherWindows: boolean) => Promise<void>;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export function ProjectProvider({ children, launchContext }: { children: ReactNode; launchContext?: LaunchContext }) {
  const openProject = async (uri: string, closeOtherWindows: boolean) => {
    try {
      if (closeOtherWindows) {
        runAppleScriptSync(`
            tell application "System Events"
              tell process "IBM Bob"
                repeat while window 1 exists
                  click button 1 of window 1
                end repeat
              end tell
            end tell
            `);
      }
      await open(uri, "IBM Bob");

      const { callbackLaunchOptions } = launchContext || {};

      if (callbackLaunchOptions) {
        callbackLaunchCommand(callbackLaunchOptions, {
          // TODO should be determined what we want to expose
          projectPath: uri.split("file://").slice(1).join("/"),
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
