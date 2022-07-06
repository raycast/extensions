import { Toast } from "@raycast/api";
import { capitalizeFirstLetter, copyQuestion, fetchQuestion } from "./util";

export default async () => {
  const toast = new Toast({ style: Toast.Style.Animated, title: "Fetching Question.." });
  await toast.show();

  const type = Math.random() > 0.5 ? "TRUTH" : "DARE";

  const { question, error } = await fetchQuestion(type);

  if (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "Slow down!";
    toast.message = "You're fetching questions too quickly.";
    return;
  }

  toast.style = type === "TRUTH" ? Toast.Style.Success : Toast.Style.Failure;
  toast.primaryAction = {
    title: "Copy",
    onAction: () => copyQuestion(question),
  };
  toast.title = capitalizeFirstLetter(type);
  toast.message = question;
};
