import { useState } from "react";
import { List, Clipboard, showToast, Toast } from "@raycast/api";
import { OpenAIModule } from "./utils/grammerUtil";
import { CommandType, ToneType } from "./types";
import { Chat } from "./types";
import CommandList from "./components/CommandList";
import ResultSection from "./components/ResultSection";
import ToneTypeDropDown from "./components/ToneTypeDropdown";
import { getAccessToken, getIsHistoryPaused } from "./utils";
import { useHistory } from "./utils/historyUtil";
import { v4 as uuidv4 } from "uuid";

const openAIKey = getAccessToken();
const isHistoryPaused = getIsHistoryPaused();
if (!openAIKey) {
  throw new Error("OPENAI_SECRET_KEY is missing");
}

const openAI = new OpenAIModule(openAIKey);

type State = {
  command: CommandType;
  toneType: ToneType;
  isLoading: boolean;
  chat: Chat;
};

export default function Command() {
  const { add } = useHistory();
  const [state, setState] = useState<State>({
    command: CommandType.Fix,
    toneType: ToneType.Professional,
    isLoading: false,
    chat: {} as Chat,
  });

  const [isShowingDetail, setIsShowingDetail] = useState(false);

  async function onExecute(command: CommandType) {
    try {
      setState((previous) => ({
        ...previous,
        command,
        isLoading: true,
      }));

      let output = "";

      output = await executeCommand(command, state.chat.question);
      setState((previous) => ({
        ...previous,
        isLoading: false,
        chat: {
          ...previous.chat,
          answer: output,
        },
      }));

      if (output) {
        if (!isHistoryPaused) {
          add(state.chat);
        }
        Clipboard.copy(output);
        await showToast({
          style: Toast.Style.Success,
          title: "Result has been copied to the clipboard.",
        });
      }
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Cannot execute command",
        message: String(error),
      });

      setState((previous) => ({
        ...previous,
        isLoading: false,
      }));
    }
  }

  async function executeCommand(command: CommandType, text: string): Promise<string> {
    switch (command) {
      case CommandType.Fix:
        return openAI.fixGrammer(text);
      case CommandType.Paraphrase:
        return openAI.correctGrammer(text);
      case CommandType.ToneChange:
        return openAI.changeTone(text, state.toneType);
      case CommandType.ContinueText:
        return openAI.continueText(text);
      default:
        throw new Error("Invalid command");
    }
  }

  function onToneTypeChange(toneType: ToneType) {
    setState((previous) => ({ ...previous, toneType }));
  }

  return (
    <List
      searchText={state.chat.question}
      isLoading={state.isLoading}
      isShowingDetail={isShowingDetail}
      onSearchTextChange={(newValue) => {
        setState((previous) => ({
          ...previous,
          chat: { id: uuidv4(), question: newValue, answer: "", created_at: new Date().toISOString() } as Chat,
        }));
      }}
      searchBarAccessory={<ToneTypeDropDown onToneTypeChange={onToneTypeChange}></ToneTypeDropDown>}
    >
      <ResultSection chat={state.chat} isShowingDetail={isShowingDetail} setIsShowingDetail={setIsShowingDetail} />
      <CommandList onExecute={onExecute} searchText={state.chat.question} />
    </List>
  );
}
