import { Entry } from "fast-glob"
export interface Notebook {
  id: string
  title: string
  lastVisit: number
  type: 1 | 2
}

export type NotebookFilter = "all" | "mindmap" | "flashcard"
export type DocmentFilter = "all" | "selected" | "unselected"
export interface SearchNotebookState {
  notebooks: Notebook[] | undefined
  loading: boolean
  error?: Error
}

export type Doc = Entry & { index: number }
export interface SearchDocState {
  docs: Doc[]
  loading: boolean
  error?: Error
}

export interface Preferences {
  skipAlert: boolean
  waitingTime: "2" | "3" | "4" | "5" | "6"
  folderDepth: "2" | "3" | "4" | "5" | "6"
  ignorePattern: string
  parentNote1: string
  parentNote2: string
  parentNote3: string
  parentNote4: string
  parentNote5: string
  commonTags: string
  showConfetti: boolean
}

export interface NewNote {
  title: string
  excerptText: string
  commentText: string
  tags: string
  link: string
  color: string
}
