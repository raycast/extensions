import { AI, closeMainWindow, environment, getPreferenceValues, LaunchProps, showToast, Toast } from '@raycast/api';
import { addTodo, handleError } from './api';

export default async function Command(props: LaunchProps & { arguments: Arguments.QuickAddTodo }) {
  try {
    const { shouldCloseMainWindow, dontUseAI } = getPreferenceValues<Preferences.QuickAddTodo>();
    let json, toastMsg;

    if (shouldCloseMainWindow) {
      await closeMainWindow();
    } else {
      await showToast({ style: Toast.Style.Animated, title: 'Adding to-do' });
    }

    if (dontUseAI || !environment.canAccess(AI)) {
      const { text } = props.arguments;
      json = { title: text };
      toastMsg = `Added "${text}" to 'Inbox'`;
    } else {
      const result =
        await AI.ask(`Act as a task manager. I'll give you a task in a natural language. Your job is to return me only a parsable and minified JSON object.

Here are the possible keys of the JSON object with their respective values:
- title: The title of the to-do.
- when: Possible values: "today", "tomorrow", "evening", "anytime", "someday", natural language dates such as "in 3 days" or "next tuesday", or a date time string (natural language dates followed by the @ symbol and then followed by a time string. E.g. "this friday@14:00".).
- deadline: The deadline to apply to the to-do. Only can be a date string (yyyy-mm-dd).
- tags: Comma separated strings corresponding to the titles of tags.
- list: The title of a project or area to add to.
- heading: The title of a heading within a project to add to.
- completed: Whether or not the to-do should be set to complete.
- canceled: Whether or not the to-do should be set to canceled.

Please make sure to follow these rules:
- You should return a valid, parsable JSON object.
- Don't add a key if the user didn't specify it.

Here are some examples to help you out:
- Book flights today in my Trips list: {"title":"Book flights","when":"today","list":"Trips"}
- Add milk to my groceries list for tomorrow with Errand tag: {"title":"Milk","when":"tomorrow","list":"Groceries","tags":"Errand"}
- Respond to mails: {"title":"Respond to mails"}
- Buy a new car by the end of the year: {"title":"Buy a new car","deadline":"2023-12-31"}
- Collect dry cleaning this evening at 7PM: {"title":"Collect dry cleaning","when":"evening@19:00"}
- Fix landing page this Friday in bugs heading of Revamp Homepage project: {"title":"Fix landing page","when":"this friday","list":"Revamp Homepage","heading":"Bugs"}
- Add a completed task called "Ship feature" to my Work list: {"title":"Ship feature","list":"Work","completed":"true"}
- Answer to mails by this week-end: {"title":"Answer to mails","deadline":"2023-09-08"}

Here's the task: "${props.fallbackText ?? props.arguments.text}"`);

      json = JSON.parse(result.trim());
    }

    if (props.arguments.notes) {
      json.notes = props.arguments.notes;
    }

    if (props.arguments.checklist) {
      json['checklist-items'] = props.arguments.checklist
        .split(',')
        .map((item) => item.trim())
        .join('\n');
    }

    await addTodo(json);

    await showToast({
      style: Toast.Style.Success,
      title: 'Added to-do',
      message: toastMsg,
    });
  } catch (error) {
    handleError(error, 'Unable to add to-do');
  }
}
