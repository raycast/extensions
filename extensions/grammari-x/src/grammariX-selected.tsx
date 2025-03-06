import { useState, useEffect } from "react";
import { List, Clipboard, showToast, Toast, environment, AI, getSelectedText } from "@raycast/api";
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

export default function Command() {
  const { add } = useHistory();

  const [state, setState] = useState<State>({
    command: CommandType.Fix,
    toneType: ToneType.Professional,
    isLoading: true,
    chat: { id: uuidv4(), question: "", answer: "", created_at: new Date().toISOString() } as Chat,
  });
  const [isShowingDetail, setIsShowingDetail] = useState(false);

  useEffect(() => {
    const fetchSelectedText = async () => {
      try {
        await getSelectedText();
        const selectedText = await getSelectedText();
        if (selectedText) {
          setState((previous) => ({
            ...previous,
            chat: { id: uuidv4(), question: selectedText, answer: "", created_at: new Date().toISOString() } as Chat,
          }));
        }
      } catch (error) {
        setState((previous) => ({
          ...previous,
          chat: { id: uuidv4(), question: "", answer: "", created_at: new Date().toISOString() } as Chat,
        }));
        await showToast({
          style: Toast.Style.Failure,
          title: "No text selected",
        });
      } finally {
        setTimeout(() => {
          setState((previous) => ({
            ...previous,
            isLoading: false,
          }));
        }, 500);
      }
    };

    fetchSelectedText();
  }, []);

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

  if (isValidKey) {
    if (state.isLoading) {
      return (
        <List
          isLoading={true}
          searchBarPlaceholder="Loading..."
          searchText=""
          onSearchTextChange={() => {
            return;
          }}
        />
      );
    }

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
