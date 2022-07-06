import { Toast } from "@raycast/api";
import { copyQuestion, fetchQuestion } from "./util";

export default async () => {
  const toast = new Toast({ style: Toast.Style.Animated, title: "Fetching Question.." });
  await toast.show();

  const { question, error } = await fetchQuestion("DARE");

  if (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "Slow down!";
    toast.message = "You're fetching questions too quickly.";
    return;
  }

  toast.style = Toast.Style.Failure;
  toast.primaryAction = {
    title: "Copy",
    onAction: () => copyQuestion(question),
  };
  toast.title = "Dare";
  toast.message = question;
};
