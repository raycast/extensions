import type { Label, Project } from "../domain/model";
import type { TaskService } from "../domain/task-service";

function notifyAfter<T>(operation: () => T, onChanged: () => void): T {
  const result = operation();
  onChanged();
  return result;
}

export function createProject(service: TaskService, name: string, onChanged: () => void): Project {
  return notifyAfter(() => service.createProject(name), onChanged);
}

export function renameProject(service: TaskService, projectId: string, name: string, onChanged: () => void): Project {
  return notifyAfter(() => service.renameProject(projectId, name), onChanged);
}

export function removeProject(service: TaskService, projectId: string, onChanged: () => void): void {
  notifyAfter(() => service.removeProject(projectId), onChanged);
}

export function createLabel(service: TaskService, name: string, onChanged: () => void): Label {
  return notifyAfter(() => service.createLabel(name), onChanged);
}

export function renameLabel(service: TaskService, labelId: string, name: string, onChanged: () => void): Label {
  return notifyAfter(() => service.renameLabel(labelId, name), onChanged);
}

export function removeLabel(service: TaskService, labelId: string, onChanged: () => void): void {
  notifyAfter(() => service.removeLabel(labelId), onChanged);
}
