import { Todo } from '@/types/todo'

export function parseTodosToDoneWorkString(todos: Todo[]): string {
  const groupedByTag = todos.reduce((group, todo) => {
    const { tag } = todo
    if (tag?.name) {
      group[tag.name] = group[tag.name] ?? []
      group[tag.name].push(`- ${todo.title}`)
      return group
    } else {
      group[''] = group[''] ?? []
      group[''].push(`- ${todo.title}`)
      return group
    }
  }, {} as any)

  const copyString = Object.entries(groupedByTag)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .reduce((acc, [tag, todos]: any) => {
      return `${acc}\n\n${tag}\n${todos.join('\n')}`
    }, '')

  return copyString
}
