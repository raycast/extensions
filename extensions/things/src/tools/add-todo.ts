import { addTodo } from '../api';

type Input = {
  /** The todo parameters to set */
  todoParams: {
    /* The title of the to-do. */
    title?: string;
    /* The notes of the to-do. */
    notes?: string;
    /* Possible values for due date: "today", "tomorrow", "evening", "anytime", "someday", natural language dates such as "in 3 days" or "next tuesday", or a date time string (natural language dates followed by the @ symbol and then followed by a time string. E.g. "this friday@14:00".) */
    when: string;
    /* The deadline to apply to the to-do. Only can be a date string (yyyy-mm-dd). */
    deadline?: string;
    /* Comma separated strings corresponding to the titles of tags. Replaces all current tags. Does not apply a tag if the specified tag doesn’t exist. */
    tags?: string;
    /* Comma separated strings corresponding to the titles of tags. Adds the specified tags to a to-do. Does not apply a tag if the specified tag doesn’t exist. */
    'add-tags'?: string;
    /* String separated by new lines (encoded to %0a). Checklist items to add to the to-do (maximum of 100). */
    'checklist-items'?: string;
    /* The ID of a project or area to add to. Takes precedence over list */
    'list-id'?: string;
    /* The title of a heading within a project to add to. */
    heading?: string;
    /* Takes precedence over heading. The ID of a heading within a project to move the to-do to. Ignored if the to-do is not in a project with the specified heading. Can be used together with list or list-id */
    'heading-id'?: string;
    /* Complete a to-do or set a to-do to incomplete. Ignored if canceled is also set to true. Setting completed=false on a canceled to-do will also mark it as incomplete */
    completed?: boolean;
    /* Cancel a to-do or set a to-do to incomplete. Takes priority over completed. Setting canceled=false on a completed to-do will also mark it as incomplete. */
    canceled?: boolean;
    /* Whether or not the to-do should be duplicated. */
    duplicate?: boolean;
    /* The creation date of the to-do. ISO8601 date time string.*/
    'creation-date'?: string;
    /* The completion date of the to-do.  ISO8601 date time string. */
    'completion-date'?: string;
  };
};

export default async function ({ todoParams }: Input) {
  return await addTodo(todoParams);
}
