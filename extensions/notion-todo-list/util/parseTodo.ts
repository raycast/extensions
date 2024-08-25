import capitalCase from "./capitalCase";
import Sugar from "sugar";
import Todo from "../types/Todo"

export default function parseTodo(taskTitle: string): Todo {
    let priority: string = "P4";
    let match = /p[1-4]/i.exec(taskTitle)
    if (match) {
        priority = match[0].toUpperCase()
        taskTitle = taskTitle.replace(/p[1-4]/i, "")
    }
    const tagsIndex = taskTitle.indexOf("#")
    const dateIndex = taskTitle.indexOf("/")
    const todoTitle = capitalCase(taskTitle.split("#")[0]).trim()
    let tagsString = taskTitle.slice(tagsIndex).split("/")[0].trim()
    tagsString = tagsString.substring(1, tagsString.length)
    let dateString = taskTitle.slice(dateIndex)
    dateString = dateString.substring(1, dateString.length).trim()
    let parsedDate = Sugar.Date.create(dateString)
    return {
        todoTitle,
        tags: tagsString,
        date: parsedDate,
        priority,
    }
}