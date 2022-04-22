import { LocalStorage, confirmAlert, Icon, popToRoot } from "@raycast/api";
import { useEffect, useReducer, useRef } from "react";
import { Bitwarden } from "./api";
import { DEFAULT_PASSWORD_OPTIONS, LOCAL_STORAGE_KEY } from "./const";
import { PasswordGeneratorOptions } from "./types";

const initialPasswordGeneratorState = {
  options: undefined as PasswordGeneratorOptions | undefined,
  password: undefined as string | undefined,
  isGenerating: true,
};

type State = typeof initialPasswordGeneratorState;

type Action =
  | { type: "generate" }
  | { type: "setPassword"; password: string }
  | { type: "setOptions"; options: PasswordGeneratorOptions }
  | { type: "cancelGenerate" }
  | { type: "clearPassword"; password: string };

const passwordReducer = (state: State, action: Action): State => {
  switch (action.type) {
    case "generate":
      return { ...state, isGenerating: true };
    case "setPassword":
      return { ...state, password: action.password, isGenerating: false };
    case "setOptions":
      return { ...state, options: action.options };
    case "cancelGenerate":
      return { ...state, isGenerating: false };
    case "clearPassword":
      return { ...state, isGenerating: false, password: undefined };
  }
};

type UsePasswordGeneratorOptions = {
  regenerateOnOptionChange?: boolean;
};

export function usePasswordGenerator(bitwardenApi: Bitwarden, hookOptions?: UsePasswordGeneratorOptions) {
  const { regenerateOnOptionChange = true } = hookOptions ?? {};

  const [{ options, ...state }, dispatch] = useReducer(passwordReducer, initialPasswordGeneratorState);
  const { abortControllerRef, renew: renewAbortController, abort: abortPreviousGenerate } = useAbortController();

  const generatePassword = async () => {
    try {
      renewAbortController();
      dispatch({ type: "generate" });
      const password = await bitwardenApi.generatePassword(options, abortControllerRef?.current);
      dispatch({ type: "setPassword", password });
    } catch (error) {
      dispatch({ type: "cancelGenerate" });
    }
  };

  const regeneratePassword = () => {
    if (state.isGenerating) return;
    generatePassword();
  };

  const setOption = async <Option extends keyof PasswordGeneratorOptions>(
    option: Option,
    value: PasswordGeneratorOptions[Option]
  ) => {
    if (!options || options[option] === value) return;
    if (state.isGenerating) {
      abortPreviousGenerate();
      dispatch({ type: "cancelGenerate" });
    }

    const newOptions = { ...options, [option]: value };
    dispatch({ type: "setOptions", options: newOptions });
    await LocalStorage.setItem(LOCAL_STORAGE_KEY.PASSWORD_OPTIONS, JSON.stringify(newOptions));
  };

  const restoreStoredOptions = async () => {
    const storedOptions = await LocalStorage.getItem<string>(LOCAL_STORAGE_KEY.PASSWORD_OPTIONS);
    const newOptions = { ...DEFAULT_PASSWORD_OPTIONS, ...(storedOptions ? JSON.parse(storedOptions) : {}) };
    dispatch({ type: "setOptions", options: newOptions });
  };

  useEffect(() => {
    if (!regenerateOnOptionChange || !options) return;
    generatePassword();
  }, [options]);

  useEffect(() => {
    restoreStoredOptions();
  }, []);

  return { ...state, regeneratePassword, options, setOption };
}

export const useOneTimePasswordHistoryWarning = async () => {
  const handleDismissAction = () => popToRoot({ clearSearchBar: false });

  const handlePrimaryAction = () => LocalStorage.setItem(LOCAL_STORAGE_KEY.PASSWORD_ONE_TIME_WARNING, true);

  const displayWarning = async () => {
    const alertWasShown = await LocalStorage.getItem<boolean>(LOCAL_STORAGE_KEY.PASSWORD_ONE_TIME_WARNING);
    if (alertWasShown) return;

    await confirmAlert({
      title: "Warning",
      message: "Password history is not available yet, so make sure to store the password after generating it!",
      icon: Icon.ExclamationMark,
      dismissAction: {
        title: "Go back",
        onAction: handleDismissAction,
      },
      primaryAction: {
        title: "I understand",
        onAction: handlePrimaryAction,
      },
    });
  };

  useEffect(() => {
    displayWarning();
  }, []);
};

export function useAbortController() {
  const abortControllerRef = useRef(new AbortController());

  const renew = () => {
    if (!abortControllerRef.current.signal.aborted) return;
    abortControllerRef.current = new AbortController();
  };

  const abort = () => {
    abortControllerRef.current?.abort();
  };

  return { abortControllerRef, renew, abort };
}
