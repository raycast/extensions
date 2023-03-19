import { Action, ActionPanel, List } from "@raycast/api"
import React from "react"
import { Task } from "../type/Task"
import { CreateTaskAction } from "./CreateTaskAction"

export interface EmptyViewProps {
    tasks: Task[]
    onCreate: (task: Task) => void
}

export const EmptyView = ({ onCreate }: EmptyViewProps) => {
    return (
        <List.EmptyView
            icon={"💀"}
            title={"No Task Added"}
            description={"Remember your bonus next year"}
            actions={
                <ActionPanel>
                    <CreateTaskAction onCreate={onCreate} />
                </ActionPanel>
            }
        />
    )
}