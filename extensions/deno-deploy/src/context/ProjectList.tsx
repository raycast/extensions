import type { FC, PropsWithChildren } from "react";
import { createContext, useContext } from "react";

export interface IProjectListContext {
  refresh: () => void;
}

const ProjectListContext = createContext<IProjectListContext>(null as unknown as IProjectListContext);

export const useProjectList = () => useContext(ProjectListContext);

export const ProjectListProvider: FC<PropsWithChildren<IProjectListContext>> = ({ children, refresh }) => {
  return (
    <ProjectListContext.Provider
      value={{
        refresh,
      }}
    >
      {children}
    </ProjectListContext.Provider>
  );
};
