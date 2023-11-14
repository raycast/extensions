import { Action } from "@raycast/api";
import dayjs from "dayjs";
import { Entry } from "../api";

export function dayToMarkdown(standup: Record<string, Entry>): string {
    const day = dayjs(Object.values(standup)[0].datetime).format("dddd MMMM Do");
    let markdown = `# Standup Notes for ${day}\n\n`;


    Object.values(standup).forEach(entry => {
        markdown += `   - ${dayjs(entry.datetime).format("HH:mm")} ${entry.notes}\n`;
    })
    return markdown;
}

export function CopyDayMarkdownAction(props: { day?: Record<string, Entry> }) {
    if (!props.day) {
        return null
    }

    const markdown = dayToMarkdown(props.day);
    return (
        <Action.CopyToClipboard title="Copy day's markdown" content={markdown} />
    )
}