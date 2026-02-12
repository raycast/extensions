import { createContext, useContext, ReactNode, useCallback } from "react";
import { openProjectInWindsurf, openNewWindsurfWindow } from "../windsurf";
import { closeOtherWindows } from "../preferences";

export interface LaunchContext {
  launchFromFinder?: string;
}

interface ProjectContextType {
  openProject: (uri: string, closeOthers?: boolean) => Promise<void>;
  openNewWindow: () => Promise<void>;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export function ProjectProvider({
  children,
}: {
  children: ReactNode;
  launchContext?: LaunchContext;
}) {
  const openProject = useCallback(
    async (uri: string, closeOthers?: boolean) => {
      const path = uri.startsWith("file://")
        ? decodeURIComponent(uri.slice(7))
        : uri;
      await openProjectInWindsurf(path, closeOthers ?? closeOtherWindows);
    },
    []
  );

  const openNewWindow = useCallback(async () => {
    await openNewWindsurfWindow();
  }, []);

  return (
    <ProjectContext.Provider value={{ openProject, openNewWindow }}>
      {children}
    </ProjectContext.Provider>
  );
}

export function useProject() {
  const context = useContext(ProjectContext);
  if (!context) {
    throw new Error("useProject must be used within ProjectProvider");
  }
  return context;
}
