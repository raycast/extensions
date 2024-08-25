import { Client } from "@notionhq/client";
import parseTodo from "../util/parseTodo"
import parseTags from "../util/parseTag";
import determineIcon from "../util/determineIcon";
import { Tag, TagArray } from "../types/Tags";
import Todo from "../types/Todo"


export async function addTodoToNotion(client: Client, databaseId: string, todoString: string) {
    const todo: Todo = parseTodo(todoString)
    const { todoTitle, tags, date, priority } = todo
    let parsedTags: TagArray = parseTags(tags)
    let icon = determineIcon(todoString, parsedTags)
    const response = await client.pages.create({
        parent: {
            "type": "database_id",
            database_id: databaseId
        },
        icon: {
            type: "emoji",
            "emoji": icon,
        },
        properties: {
            Name: {
                type: 'title',
                title: [
                    {
                        type: 'text',
                        text: {content: todoTitle}
                    }
                ]
            },
            "Planned": {
                type: 'date',
                date: {start: date.toISOString()}
            },
            Status: {
                type: 'status',
                status: {name: "Inbox"}
            },
            Tags: {"multi_select": parsedTags},
            Priority: {
                type: 'select',
                select: {name: priority}
            }
        }
    })
}