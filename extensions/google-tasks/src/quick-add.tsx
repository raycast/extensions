import { Toast, showToast } from "@raycast/api";

import { createTask, getDefaultList } from "./api/endpoints";
import * as google from "./api/oauth";

interface Arguments {
  title: string;
  notes: string;
}

export default async function Command(props: { arguments: Arguments }) {
  try {
    await google.authorize();
    const { title, notes } = props.arguments;

    const tasklist = await getDefaultList();
    await createTask(tasklist.id, { title, notes, due: null });

    showToast({ title: "Task Created", message: title });
  } catch (error) {
    console.error(error);
    showToast({ style: Toast.Style.Failure, title: String(error) });
  }
}
