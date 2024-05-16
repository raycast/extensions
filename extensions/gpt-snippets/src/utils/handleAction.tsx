import { Clipboard, showToast, Toast } from "@raycast/api";
import { sendOpenAIRequest } from "./request";
import ResultPage from "../components/ResultPage";
import { IAction } from "../constants/initialActions";

async function handleAction(action: IAction, push: (element: JSX.Element) => void) {
  showToast(Toast.Style.Animated, `Executing ${action.title}`);

  try {
    const clipboardContent = (await Clipboard.readText()) as string;
    const result = await sendOpenAIRequest(action.prompt, clipboardContent);


    push(<ResultPage action={action} result={result} />);
    showToast(Toast.Style.Success, `${action.title} Executed`);
  } catch (error) {
    showToast(Toast.Style.Failure, `Failed to execute ${action.title}`);
    console.error(error);
  }
}

export default handleAction;
