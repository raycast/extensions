import { useEffect, useRef, useState } from "react";

import { useDataManager } from "@hooks";

import { ScriptCommand } from "@models";

import { sourceCodeNormalURL } from "@urls";

type SourceCodeState = {
  content: string;
  scriptCommand: ScriptCommand;
};

type UseSourceCodeProps = {
  title: string;
  isLoading: boolean;
  sourceCodeURL: string;
  sourceCode: string;
};

type UseSourceCode = (initialScriptCommand: ScriptCommand) => UseSourceCodeProps;

export const useSourceCode: UseSourceCode = (initialScriptCommand) => {
  const abort = useRef<AbortController | null>(null);
  const { dataManager } = useDataManager();

  const [state, setState] = useState<SourceCodeState>({
    content: "",
    scriptCommand: initialScriptCommand,
  });

  useEffect(() => {
    const fetch = async () => {
      abort.current?.abort();
      abort.current = new AbortController();

      const result = await dataManager.fetchSourceCode(state.scriptCommand, abort.current.signal);

      if (!abort.current.signal.aborted) {
        setState((oldState) => ({
          ...oldState,
          content: result,
        }));
      }
    };

    fetch();

    return () => {
      abort.current?.abort();
    };
  }, [state]);

  return {
    title: state.scriptCommand.title,
    isLoading: state.content.length === 0,
    sourceCodeURL: sourceCodeNormalURL(state.scriptCommand),
    sourceCode: details(state.scriptCommand.language, state.scriptCommand.filename, state.content),
  };
};

type Details = (language: string, file: string, sourceCode: string) => string;

const details: Details = (language, filename, sourceCode) => {
  let content = `
  Language: **${language}**  
  File: **${filename}**  
  \n\n  
  `;
  content += "```" + language + "\n";
  content += sourceCode;
  content += "\n```";

  return content;
};
