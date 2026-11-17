import {
  Action,
  ActionPanel,
  getPreferenceValues,
  Icon,
  List,
} from "@raycast/api"
import {CreateForm} from "../../components/create/create-form"
import {labelForTaskColumn, orderForTaskColumn} from "../../helpers/focustask"
import {groupBy, mapValues, sortBy} from "lodash"
import {useState} from "react"
import {useFetchLists, useFetchTasks} from "../../api/hooks"
import {ChecklistListItem} from "./checklist-list-item"
import {TaskListItem} from "./task-list-item"

export const SearchList = () => {
  const isShowingDetail =
    getPreferenceValues<Preferences.Search>()["show-detail-view"]
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

  return (
    <List
      searchBarPlaceholder={placeholder}
      isLoading={isLoading}
      searchText={search}
      onSearchTextChange={setSearch}
      throttle
      isShowingDetail={isShowingDetail}
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
                <Action.Push
                  title="Create Task"
                  icon={Icon.NewDocument}
                  target={<CreateForm initialTitle={search} />}
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
