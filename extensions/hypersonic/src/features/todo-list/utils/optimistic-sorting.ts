import { Todo } from '@/types/todo'
import { groupBy } from 'lodash'

export function optimisticSorting(todos: Todo[]) {
  const todosTimeSorted = todos.sort((a, b) => {
    if (a.date && b.date) {
      return a.date.getTime() - b.date.getTime()
    } else if (a.date) {
      return -1
    } else if (b.date) {
      return 1
    } else {
      return 0
    }
  })

  const groupedTodos = groupBy(
    todosTimeSorted,
    (todo: Todo) => todo?.status?.id || 'no-status'
  )

  return groupedTodos
}
