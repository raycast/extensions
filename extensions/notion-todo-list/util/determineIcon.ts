import { TagArray } from "../types/Tags"

export default function determineIcon(taskTitle: string, tagArr: TagArray) {
    taskTitle = taskTitle.toLowerCase()
    let icon:string = "✅"
    for (const tagObject of tagArr) {
        if (tagObject.name === "Health and Fitness") icon = "🫀"
        if (tagObject.name === "Shopping") icon = "🛒"
        if (tagObject.name === "Work") icon="💼"
        if (tagObject.name === "Education") icon="🎒"
    }
    if (taskTitle.includes("email") || taskTitle.includes("e-mail")) icon = "📧"
    if (taskTitle.includes("mail") && !taskTitle.includes("email")) icon = "📬"
    if (taskTitle.includes("call") || taskTitle.includes("text")) icon = "📱"
    if (taskTitle.includes("ship")) icon = "📦"
    if (taskTitle.includes("oil") || taskTitle.includes("smog") || taskTitle.includes("car")) icon = "🚗"
    if (taskTitle.includes("pay") || taskTitle.includes("bank") || taskTitle.includes("bill")) icon = "💵"
    if (taskTitle.includes("buy") || taskTitle.includes("purchase")) icon = "🛒"
    return icon
}