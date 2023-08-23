import { useState } from "react";
import { List, Clipboard, showToast, Toast } from "@raycast/api";
import { OpenAIModule } from "./grammarCorrection";
import { CommandType } from "./types";
import CommandList from "./components/CommandList";
import ResultSection from "./components/ResultSection";
import { getAccessToken } from "./utils";

const openAIKey = getAccessToken();
if (!openAIKey) {
  throw new Error("OPENAI_SECRET_KEY is missing");
}

const openAI = new OpenAIModule(openAIKey);

type State = {
  command: CommandType;
  isLoading: boolean;
  searchText: string;
  output: string;
};

export default function Command() {
  const [state, setState] = useState<State>({
    command: CommandType.Fix,
    isLoading: false,
    searchText: "",
    output: "",
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

      output = await executeCommand(command, state.searchText);
      setState((previous) => ({
        ...previous,
        isLoading: false,
        output,
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
    }
  }

  async function executeCommand(command: CommandType, text: string): Promise<string> {
    switch (command) {
      case CommandType.Fix:
        return openAI.fixGrammer(text);
      case CommandType.Rewrite:
        return openAI.correctGrammer(text);
      default:
        throw new Error("Invalid command");
    }
  }

  return (
    <List
      searchText={state.searchText}
      isLoading={state.isLoading}
      isShowingDetail={isShowingDetail}
      onSearchTextChange={(newValue) => {
        setState((previous) => ({ ...previous, output: "", searchText: newValue }));
      }}
    >
      <ResultSection output={state.output} isShowingDetail={isShowingDetail} setIsShowingDetail={setIsShowingDetail} />
      <CommandList onExecute={onExecute} searchText={state.searchText} />
    </List>
  );
}
