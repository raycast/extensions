import { Tag, TagArray } from "../types/Tags"

export default function parseTags(a: string): TagArray {
    const tagArray: TagArray = []
    if (a.includes("prs") || a.includes("personal")) tagArray.push({ name: "Personal "})
    if (a.includes("work")) tagArray.push({ name: "Work" })
    if (a.includes("edu") || a.includes("school")) tagArray.push({ name: "Education"})
    if (tagArray.length === 0) tagArray.push({ name: "Uncategorized" })
    return tagArray
}