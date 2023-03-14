import { LocalStorage } from "@raycast/api";
import { useEffect, useReducer } from "react";
import { LOCAL_STORAGE_KEY } from "~/constants/general";
import { PasswordGeneratorOptions } from "~/types/passwords";
import useAbortController from "~/utils/hooks/useAbortController";
import { useBitwarden } from "~/context/bitwarden";
import { getPasswordGeneratorOptions } from "~/utils/passwords";

const initialPasswordGeneratorState = {
  options: undefined as PasswordGeneratorOptions | undefined,
  password: undefined as string | undefined,
  isGenerating: true,
};

type GeneratorState = typeof initialPasswordGeneratorState;

type GeneratorActions =
  | { type: "generate" }
  | { type: "setPassword"; password: string }
  | { type: "setOptions"; options: PasswordGeneratorOptions }
  | { type: "cancelGenerate" }
  | { type: "clearPassword"; password: string };

const passwordReducer = (state: GeneratorState, action: GeneratorActions): GeneratorState => {
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

function usePasswordGenerator() {
  const bitwarden = useBitwarden();
  const [{ options, ...state }, dispatch] = useReducer(passwordReducer, initialPasswordGeneratorState);
  const { abortControllerRef, renew: renewAbortController, abort: abortPreviousGenerate } = useAbortController();

  const generatePassword = async (passwordOptions = options) => {
    try {
      renewAbortController();
      dispatch({ type: "generate" });
      const password = await bitwarden.generatePassword(passwordOptions, abortControllerRef?.current);
      dispatch({ type: "setPassword", password });
    } catch (error) {
      // generate password was likely aborted
      if (abortControllerRef?.current.signal.aborted) {
        dispatch({ type: "cancelGenerate" });
      }
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
    }

    const newOptions = { ...options, [option]: value };
    dispatch({ type: "setOptions", options: newOptions });
    await Promise.all([
      LocalStorage.setItem(LOCAL_STORAGE_KEY.PASSWORD_OPTIONS, JSON.stringify(newOptions)),
      generatePassword(newOptions),
    ]);
  };

  const restoreStoredOptions = async () => {
    const newOptions = await getPasswordGeneratorOptions();
    dispatch({ type: "setOptions", options: newOptions });
    await generatePassword(newOptions);
  };

  useEffect(() => {
    restoreStoredOptions();
  }, []);

  return { ...state, regeneratePassword, options, setOption };
}

export default usePasswordGenerator;
