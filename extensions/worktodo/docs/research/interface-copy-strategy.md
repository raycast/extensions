# Interface copy strategy

## Scope

This strategy covers visible copy in the Raycast commands, menu bar, forms, actions, alerts, empty states, and feedback. MCP tool descriptions are a technical contract and follow their own explicit, agent-facing style.

The Raycast ESLint preset's title-case rule is disabled because sentence case is an intentional product convention.

## Voice

Worktodo is direct, calm, and compact. Copy should describe the state or next action without marketing language, filler, or unnecessary references to Worktodo.

- Use one main idea per sentence.
- Prefer familiar verbs: create, open, edit, move, remove, restore, export.
- Name the object when an action could be read out of context: `Edit task`, not `Edit`.
- Omit the object when a parent menu already names it and every child action applies to it: `Edit`, not `Edit task`.
- Explain a destructive consequence before confirmation.

## Interface patterns

| Context                                | Pattern                                      | Example                                       |
| -------------------------------------- | -------------------------------------------- | --------------------------------------------- |
| Command, navigation, and action titles | Sentence case; no ending punctuation         | `New task`, `Move to trash`                   |
| Action in an object submenu            | Verb without the repeated object             | `Complete`, `Open`, `Edit`                    |
| Form-opening action                    | `New` + object                               | `New project`                                 |
| Form submission                        | Concrete verb + object                       | `Create project`, `Save task`                 |
| Success feedback                       | Object + past-tense verb                     | `Task created`                                |
| Failure feedback                       | `Unable to` + verb + object                  | `Unable to create task`                       |
| Search placeholder                     | Sentence case; name the searchable set       | `Search completed tasks`                      |
| Empty-state title                      | Short statement of the state                 | `No tasks yet`                                |
| Empty-state description                | One sentence with the next step or view rule | `Create a task to get started.`               |
| Confirmation title                     | Concrete destructive question                | `Remove “Planning”?`                          |
| Confirmation message                   | State the user-visible consequence           | `Tasks in this project will have no project.` |

## Terminology

- `New task` opens the creation form. `Create task` commits it.
- A menu under a named task uses `Complete`, `Open`, and `Edit`. A mixed action panel uses `Complete task`, `Edit task`, and `Move task` to distinguish selected-task actions from app-level actions.
- `Quick add` remains the command name; its submission action is `Create task`.
- Tasks are moved to `Trash` because the operation is recoverable. Do not call this remove or delete.
- Projects and labels are removed because their definitions are deleted. Confirmations explain what happens to their tasks or assignments.
- Use `Export backup` and `Restore backup` for the backup workflow. Use `Replace Worktodo data` only at the destructive confirmation step.
- Capitalize only the first word, proper names, and initialisms. A single-word view such as `Trash` is capitalized naturally; within a phrase, use `Move to trash`.

## Punctuation and ellipses

Complete sentences end with punctuation. Titles, labels, menu items, and placeholders do not.

Do not add an ellipsis to an action merely because it opens another view or asks for input. Raycast already shows the navigation transition, and applying the older macOS convention to only some actions makes the interface look inconsistent. Use an ellipsis only when displayed content has actually been truncated.
