export interface Task {
  id: string
  deferDate: Date | null
  formattedDeferDate: string | null
  title: string
  note: string | null
  weight: number
  column: string
  difficulty: string
  listId: string | null
  url: string
  visibleInDefaultFrame: boolean
}

export type TaskStatus = "current" | "next" | "icebox"

export interface Checklist {
  id: string
  title: string
  weight: number
  isDefault: boolean
  color: string | null
  colorClassName: string | null
  icon: string | null
  url: string
}

export type TasksResponse = {error: string} | {tasks: Task[]}
export type CreateTaskResponse = {error: string} | {id: string; url: string}
export type ChecklistResponse = {error: string} | {lists: Checklist[]}
