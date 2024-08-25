import { Action, ActionPanel, Form, getPreferenceValues, LaunchProps, closeMainWindow, popToRoot } from "@raycast/api";
import { useEffect } from "react";
import { Client } from "@notionhq/client";
import { addTodoToNotion } from "../api/addTodoToNotion"

const { notionToken, databaseId } = getPreferenceValues();

const notion = new Client({
    auth: notionToken
})


export default function QuickAddTodo(props: LaunchProps<{arguments: Arguments.QuickAddTodoItem}>) {
    const { task } = props.arguments
    addTodoToNotion(notion, databaseId, task)
    useEffect(function() {
        setTimeout(function() {
            closeMainWindow({ clearRootSearch: true })
        }, 100)
    }, [])
    return (
        <Form />
    )

}   