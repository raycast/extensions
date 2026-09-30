import { useState, useEffect } from "react";
import { List, Clipboard, showToast, Toast, environment, AI, LaunchProps } from "@raycast/api";
import { OpenAIModule } from "./utils/grammerUtil";
import { CommandType, ToneType, State } from "./types";
import { Chat } from "./types";
import CommandList from "./components/CommandList";
import ResultSection from "./components/ResultSection";
import ToneTypeDropDown from "./components/ToneTypeDropdown";
import ShowPreferences from "./components/ShowPreferences";
import { getAccessToken, getIsHistoryPaused } from "./utils";
import { useHistory } from "./utils/historyUtil";
import { v4 as uuidv4 } from "uuid";

const openAIKey = getAccessToken();
const isHistoryPaused = getIsHistoryPaused();
const isValidKey = openAIKey || environment.canAccess(AI);

if (!isValidKey) {
  showToast({
    style: Toast.Style.Failure,
    title: "Cannot execute command",
    message: String("You don't have Raycast Pro subscrition you need to provide openAI key"),
  });
}

const openAI = new OpenAIModule(openAIKey);

export default function Command(props: LaunchProps<{ arguments: Arguments.GrammariX }>) {
  const { add } = useHistory();
  const { text, grammarType } = props.arguments;

  const [state, setState] = useState<State>({
    command: getEnumKeyByEnumValue(CommandType, grammarType) ?? CommandType.Fix,
    toneType: ToneType.Professional,
    isLoading: false,
    chat: { id: uuidv4(), question: text, answer: "", created_at: new Date().toISOString() } as Chat,
  });

  const [isShowingDetail, setIsShowingDetail] = useState(false);

  useEffect(() => {
    if (text) {
      onExecute(state.command);
    }
  }, [text]);
  useEffect(() => {
    if (state.chat && state.chat.answer && !isHistoryPaused) {
      add(state.chat);
    }
  }, [state]);

  async function onExecute(command: CommandType) {
    try {
      setState((previous) => ({
        ...previous,
        command,
        isLoading: true,
      }));

      const output = await executeCommand(command, state.chat.question);
      setState((previous) => ({
        ...previous,
        isLoading: false,
        chat: {
          ...previous.chat,
          answer: output.trim(),
          question: previous.chat.question.trim(),
        },
      }));

      if (output) {
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
        return openAI.paraphraseGrammer(text);
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

  function getEnumKeyByEnumValue(
    myEnum: Record<string, string | number>,
    enumValue: string | number
  ): CommandType | null {
    const keys = Object.keys(myEnum).filter((x) => myEnum[x] == enumValue);
    return keys.length > 0 ? (myEnum[keys[0]] as CommandType) : null;
  }
  if (isValidKey) {
    return (
      <List
        searchText={state.chat.question}
        isLoading={state.isLoading}
        isShowingDetail={isShowingDetail}
        searchBarPlaceholder="Enter your text here"
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
  } else {
    return <ShowPreferences />;
  }
}
