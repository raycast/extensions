
import { Action, ActionPanel, Alert, Color, confirmAlert, Detail, Icon, List, showToast, Toast, useNavigation } from "@raycast/api"
import { useEffect, useState } from "react"
import { ListDropdown } from "./components/dropdown"
import { EditTaskForm } from "./components/form"
import { Task, TaskList } from "./interfaces"
import * as google from "./oauth/google"

export default function Command() {
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [allTaskLists, setAllTaskLists] = useState<TaskList[]>([])
  const [filteredTasks, setFilteredTasks] = useState<Task[]>([])
  const [currentList, setChosenList] = useState<string>("")
  const [allTasks, setAllTasks] = useState<Task[]>([])

  const { push } = useNavigation()

  async function getTasks(list = allTaskLists): Promise<Task[]> {
    setIsLoading(true)
    const tasks = list.flatMap(async list => {
      return await google.fetchTasks(list.id)
    })
    const aTasks = (await Promise.all(tasks)).flat()
    setAllTasks(aTasks)
    if (currentList) {
      filterTasks(currentList)
    }
    setIsLoading(false)
    return aTasks
  }

  // async function getLists(): Promise<TaskList[]> {
  //   const lists = await google.fetchLists()
  //   setAllTaskLists(lists)
  //   if (!currentList) {
  //     setChosenList(lists[0].id)
  //   }
  //   filterTasks(currentList)
  //   return lists
  // }

  useEffect(() => {
    (async () => {
      setIsLoading(true)
      try {
        await google.authorize()
        await google.fetchLists()
          .then(async list => {
            setAllTaskLists(list)
            if (!currentList) { setChosenList(list[0].id) }
            const tasks = await getTasks(list)
            setAllTasks(tasks)
            filterTasks(currentList)
          })
      } catch (error) {
        console.error(error)
        setIsLoading(false)
        showToast({ style: Toast.Style.Failure, title: String(error) })
      }
      setIsLoading(false)
    })()
  }, [])

  // function getDayOfWeek(day: number) {
  //   
  // }

  async function sendAlert(title: string, message: string, primaryTitle = "OK",): Promise<boolean> {
    const options: Alert.Options = {
      title,
      message,
      primaryAction: {
        title: primaryTitle,
        style: Alert.ActionStyle.Destructive
      },
    }
    return await confirmAlert(options)
  }

  function getIcon(task: Task): any {
    if (task.completed) {
      return { source: Icon.Checkmark, tintColor: Color.Purple }
    }
    if (new Date(task.due).getTime() < new Date().getTime()) {
      return { source: Icon.ExclamationMark, tintColor: Color.Orange }
    }
    return { source: Icon.Circle, tintColor: Color.PrimaryText }
  }

  function filterTasks(listId: string) {
    if (currentList !== listId) setChosenList(listId)
    const newFilteredTasks = allTasks
      .filter(task => !task.parent && !task.completed && (task.list == listId))
    // TODO sort on due date
    // .sort((a, b) => new Date(a.due).getTime() - new Date(b.due).getTime())
    setFilteredTasks(newFilteredTasks)
  }

  async function removeTask(taskId: string) {
    // optimistic remove
    const newTasks = allTasks.filter(task => (task.id !== taskId))
    setAllTasks(newTasks)
    filterTasks(currentList)
    await getTasks()
  }

  async function addTask(task: Task) {
    // optimistic add
    const newTasks = allTasks
    newTasks.push(task)
    setAllTasks(newTasks)
    filterTasks(currentList)
    await getTasks()
  }

  async function editTask(task: Task, ind: number) {
    // optimistic edit
    const newTasks = [...allTasks]
    newTasks[ind] = Object.assign(allTasks[ind], task)
    console.log(newTasks[ind])
    console.log(task)
    setAllTasks(newTasks)
    filterTasks(currentList)
    await getTasks()
  }

  // function filterSubTasks() {
  //   // TODO: Filter out sub tasks
  // }

  function getTimeRemaining(task: Task) {
    //sort on due
    return new Date(task.due).toLocaleDateString()
  }

  // function sortNotes(note: string) {
  //  TODO: 
  // }

  if (isLoading) {
    return <Detail isLoading={isLoading} />
  }

  return (
    <List isLoading={isLoading}
      isShowingDetail
      searchBarAccessory={
        <ListDropdown chooseList={setChosenList}
          lists={allTaskLists}
          filterTasks={filterTasks}
          chosenList={currentList} />}>

      {filteredTasks.map((task, i) => (
        <List.Item key={task.id} title={task.title}
          icon={getIcon(task)}
          subtitle={task.due ? getTimeRemaining(task) : ""}
          detail={
            <List.Item.Detail
              markdown={task.notes}
              metadata={
                <List.Item.Detail.Metadata>
                  <List.Item.Detail.Metadata.Label
                    title="Title"
                    text={task.title}
                    icon={Icon.Dot}
                  />
                  <List.Item.Detail.Metadata.Separator />
                  <List.Item.Detail.Metadata.Label
                    title="Due"
                    icon={Icon.Calendar}
                    text={task.due ? new Date(task.due).toLocaleDateString() : "-"}
                  />
                </List.Item.Detail.Metadata>
              }
            />
          }
          actions={
            <ActionPanel>
              <ActionPanel.Section>
                <Action
                  icon={{ source: Icon.Checkmark, tintColor: Color.Blue }}
                  title="Mark complete"
                  shortcut={{ modifiers: ["cmd"], key: "enter" }}
                  onAction={async () => {
                    setIsLoading(true)

                    const patchTask = { completed: new Date().toISOString() } as Task
                    const res = await google.patchTask(task.id, task.list, patchTask)
                    if (res.status == 204) {
                      showToast({ style: Toast.Style.Success, title: "Deleted" })
                      await editTask(patchTask, i)
                    } else {
                      showToast({ style: Toast.Style.Failure, title: "Failed deleting" })
                    }
                    // TODO: Unncheck tasks
                    setIsLoading(false)
                    showToast({ style: Toast.Style.Success, title: "Task completed!" })
                  }}
                />
                <Action
                  icon={{ source: Icon.Plus, tintColor: Color.Yellow }}
                  title="Create Task"
                  shortcut={{ modifiers: ["cmd"], key: "n" }}
                  onAction={async () => {
                    push(<EditTaskForm index={i} currentList={currentList} lists={allTaskLists}
                      createNew={true} filterTasks={filterTasks}
                      isLoading={setIsLoading} addTask={addTask} editTask={editTask} />)
                  }}
                />
                <Action
                  icon={{ source: Icon.Pencil, tintColor: Color.Green }}
                  title="Edit"
                  shortcut={{ modifiers: ["cmd"], key: "e" }}
                  onAction={() => {
                    push(<EditTaskForm index={i} task={task} currentList={currentList} lists={allTaskLists}
                      createNew={false} filterTasks={filterTasks}
                      isLoading={setIsLoading} addTask={addTask} editTask={editTask} />)

                  }}
                />
              </ActionPanel.Section>
              <Action
                icon={{ source: Icon.TwoArrowsClockwise, tintColor: Color.PrimaryText }}
                title="Refresh"
                shortcut={{ modifiers: ["cmd"], key: "r" }}
                onAction={async () => {
                  await getTasks()
                  showToast({ style: Toast.Style.Success, title: "Refreshed" })
                }}
              />
              <Action
                icon={{ source: Icon.Trash, tintColor: Color.Red }}
                title="Delete"
                shortcut={{ modifiers: ["cmd"], key: "backspace" }}
                onAction={async () => {
                  if (await sendAlert("Delete the task?", "You will not be able to recover it later", "Delete")) {
                    setIsLoading(true)
                    const res = await google.deleteTask(task.list, task.id)
                    if (res.status == 204) {
                      showToast({ style: Toast.Style.Success, title: "Deleted" })
                      await removeTask(task.id)
                    } else {
                      showToast({ style: Toast.Style.Failure, title: "Failed deleting" })
                    }
                    setIsLoading(false)
                  }
                }}
              />
            </ActionPanel>
          }
        />
      ))
      }

    </List >
  )
}
