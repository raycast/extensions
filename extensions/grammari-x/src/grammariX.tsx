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

  async function onExecute(command: CommandType) {
    try {
      setState((previous) => ({ ...previous, command }));
      let output = "";
      if (command === CommandType.Fix) {
        setState((previous) => ({ ...previous, isLoading: true }));
        output = await openAI.fixGrammer(state.searchText || "");
        setState((previous) => ({ ...previous, isLoading: false, output }));
      } else if (command === CommandType.Rewrite) {
        setState((previous) => ({ ...previous, isLoading: true }));
        output = await openAI.correctGrammer(state.searchText || "");
        setState((previous) => ({ ...previous, isLoading: false, output }));
      }
      if (output) {
        Clipboard.copy(output);
        await showToast({
          style: Toast.Style.Success,
          title: "Result has been copied to the clipboard.",
        });
      }
      return;
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Cannot copy file path",
        message: String(error),
      });
    }
  }

  return (
    <List
      isShowingDetail={!!state.output}
      searchText={state.searchText}
      onSearchTextChange={(newValue) => {
        setState((previous) => ({ ...previous, output: "", searchText: newValue }));
      }}
    >
      <ResultSection output={state.output} />
      <CommandList onExecute={onExecute} searchText={state.searchText} />
    </List>
  );
}
