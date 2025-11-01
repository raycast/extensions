import { createContext, useContext, ReactNode } from "react";
import { open } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { run } from "../integrations/kiro-directory";
import { runAppleScriptSync } from "run-applescript";
import { LaunchContext } from "../integrations/types";
import { callbackLaunchCommand } from "raycast-cross-extension";

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
              tell process "Kiro"
                repeat while window 1 exists
                  click button 1 of window 1
                end repeat
              end tell
            end tell
            `);
      }
      await open(uri, "Kiro");

      const { kiroDirectory, callbackLaunchOptions } = launchContext || {};

      if (kiroDirectory && kiroDirectory.ruleContent) {
        await run(uri, {
          ruleContent: kiroDirectory.ruleContent,
          replace: kiroDirectory.replace,
        });
      }
      if (callbackLaunchOptions) {
        callbackLaunchCommand(callbackLaunchOptions, {
          // TODO should be determined what we want to expose
          projectPath: new URL(uri).pathname,
        });
      }
    } catch (error) {
      console.error("Error opening project:", error);
      showFailureToast(error, { title: "Failed to open project" });
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
