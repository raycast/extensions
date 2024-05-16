import { Clipboard, showToast, Toast } from "@raycast/api";
import { sendOpenAIRequest } from "./request";
import ResultPage from "../components/ResultPage";
import { Action } from "../constants/initialActions";

async function handleAction(action: Action, setSelectedAction: (action: any) => void, push: any) {
  showToast(Toast.Style.Animated, `Executing ${action.title}`);

  try {
    const clipboardContent = (await Clipboard.readText()) as string;
    const result = await sendOpenAIRequest(action.prompt, clipboardContent);
    const updatedAction = { ...action, result };
    setSelectedAction(updatedAction);
    push(<ResultPage action={updatedAction} />);
    showToast(Toast.Style.Success, `${action.title} Executed`);
  } catch (error) {
    showToast(Toast.Style.Failure, `Failed to execute ${action.title}`);
    console.error(error);
  }
}

export default handleAction;
