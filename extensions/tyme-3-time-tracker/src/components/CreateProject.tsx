import { List } from "@raycast/api";
import { useState, useEffect, useRef } from "react";
import { TaskList } from "./TaskList";
import { createProject } from "../tasks";
import { showErrorHUD } from "../utils";

interface CreateProjectProps {
  name: string;
}

export function CreateProject({ name }: CreateProjectProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [component, setComponent] = useState<JSX.Element | null>(null);
  const hasCreated = useRef(false);

  useEffect(() => {
    async function create() {
      if (hasCreated.current) return;
      hasCreated.current = true;

      try {
        const newProject = await createProject(name);
        if (newProject) {
          setComponent(<TaskList project={newProject} />);
        }
      } catch (error) {
        await showErrorHUD("creating project", error);
      } finally {
        setIsLoading(false);
      }
    }
    create();
  }, [name]);

  if (isLoading) {
    return <List isLoading={true} searchBarPlaceholder="Creating project..." />;
  }

  return component;
}
