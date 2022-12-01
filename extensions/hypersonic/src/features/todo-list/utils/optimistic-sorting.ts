import { Todo } from '@/types/todo'

export function optimisticSorting(todos: Todo[]) {
  // sort todos by inProgress, then by date
  return todos.sort((a, b) => {
    if (a.inProgress === b.inProgress) {
      if (a.date && b.date) {
        return a.date.getTime() - b.date.getTime()
      } else if (a.date) {
        return -1
      } else if (b.date) {
        return 1
      } else {
        return 0
      }
    } else if (a.inProgress) {
      return -1
    } else {
      return 1
    }
  })
}
