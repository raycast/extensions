import {Action, ActionPanel, Icon, List, useNavigation} from "@raycast/api"
import {CreateForm} from "components/create/create-form"
import {labelForTaskColumn, orderForTaskColumn} from "helpers/focustask"
import {groupBy, mapValues, sortBy} from "lodash"
import {useState} from "react"
import {useFetchLists, useFetchTasks} from "../../api/hooks"
import {ChecklistListItem} from "./checklist-list-item"
import {TaskListItem} from "./task-list-item"

export const SearchList = () => {
  const navigation = useNavigation()

  const {isLoading, tasks, error} = useFetchTasks()
  const {lists} = useFetchLists()

  const [search, setSearch] = useState("")

  const filteredLists = search
    ? lists.filter((list) =>
        list.title.toLowerCase().includes(search.toLowerCase()),
      )
    : lists

  const filteredTasks = search
    ? tasks.filter((task) =>
        task.title.toLowerCase().includes(search.toLowerCase()),
      )
    : tasks.filter((task) => task.visibleInDefaultFrame)

  const groupedTasks = mapValues(
    groupBy(filteredTasks, (task) => task.column),
    (tasks) => sortBy(tasks, (task) => task.weight),
  )

  const groupKeys = sortBy(Object.keys(groupedTasks), (key) =>
    orderForTaskColumn(key),
  )

  const groups = groupKeys.map((key) => ({key, tasks: groupedTasks[key]}))

  const placeholder = "Search for tasks and lists, or create a new task."

  const handleCreate = async () => {
    navigation.push(<CreateForm initialTitle={search} />)
  }

  return (
    <List
      searchBarPlaceholder={placeholder}
      isLoading={isLoading && tasks.length === 0}
      searchText={search}
      onSearchTextChange={setSearch}
    >
      {error ? (
        <List.EmptyView
          title="Loading failed"
          description={error}
          icon={Icon.Warning}
        />
      ) : search ? (
        <>
          {filteredLists.map((checklist) => (
            <ChecklistListItem checklist={checklist} key={checklist.id} />
          ))}

          {filteredTasks.map((task) => (
            <TaskListItem key={task.id} task={task} lists={lists} />
          ))}

          <List.Item
            title={`Create task: ${search}`}
            actions={
              <ActionPanel>
                <Action
                  title="Create Task"
                  icon={Icon.NewDocument}
                  onAction={handleCreate}
                />
              </ActionPanel>
            }
          />
        </>
      ) : (
        groups.map(({key, tasks}) => (
          <List.Section title={labelForTaskColumn(key)} key={key}>
            {tasks.map((task) => (
              <TaskListItem key={task.id} task={task} lists={lists} />
            ))}
          </List.Section>
        ))
      )}
    </List>
  )
}
