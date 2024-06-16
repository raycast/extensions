import { LocalStorage } from "@raycast/api";
import { useEffect, useReducer } from "react";
import { LOCAL_STORAGE_KEY } from "~/constants/general";
import { PasswordGeneratorOptions } from "~/types/passwords";
import useAbortController from "~/utils/hooks/useAbortController";
import { useBitwarden } from "~/context/bitwarden";
import { getPasswordGeneratorOptions } from "~/utils/passwords";
import { DEFAULT_PASSWORD_OPTIONS } from "~/constants/passwords";

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

const prepareOptions = (options: PasswordGeneratorOptions) => ({
  lowercase: options.lowercase ?? DEFAULT_PASSWORD_OPTIONS.lowercase,
  uppercase: options.uppercase ?? DEFAULT_PASSWORD_OPTIONS.uppercase,
  number: options.number ?? DEFAULT_PASSWORD_OPTIONS.number,
  special: options.special ?? DEFAULT_PASSWORD_OPTIONS.special,
  passphrase: options.passphrase ?? DEFAULT_PASSWORD_OPTIONS.passphrase,
  length: options.length ?? DEFAULT_PASSWORD_OPTIONS.length,
  words: options.words ?? DEFAULT_PASSWORD_OPTIONS.words,
  separator: options.separator ?? DEFAULT_PASSWORD_OPTIONS.separator,
  capitalize: options.capitalize ?? DEFAULT_PASSWORD_OPTIONS.capitalize,
  includeNumber: options.includeNumber ?? DEFAULT_PASSWORD_OPTIONS.includeNumber,
  minNumber: options.minNumber ?? DEFAULT_PASSWORD_OPTIONS.minNumber,
  minSpecial: options.minSpecial ?? DEFAULT_PASSWORD_OPTIONS.minSpecial,
});

export type UsePasswordGeneratorResult = ReturnType<typeof usePasswordGenerator>;

function usePasswordGenerator() {
  const bitwarden = useBitwarden();
  const [{ options, ...state }, dispatch] = useReducer(passwordReducer, initialPasswordGeneratorState);
  const { abortControllerRef, renew: renewAbortController, abort: abortPreviousGenerate } = useAbortController();

  const generatePassword = async (passwordOptions = options) => {
    try {
      if (state.isGenerating) abortPreviousGenerate();
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

  const regeneratePassword = async (newOptions?: PasswordGeneratorOptions) => {
    if (newOptions) {
      await setOptions(newOptions);
    } else {
      await generatePassword(newOptions);
    }
  };

  const setOption = async <Option extends keyof PasswordGeneratorOptions>(
    option: Option,
    value: PasswordGeneratorOptions[Option]
  ) => {
    if (!options || options[option] === value) return;
    await setOptions({ ...options, [option]: value });
  };

  const setOptions = async (newOptions: PasswordGeneratorOptions) => {
    dispatch({ type: "setOptions", options: newOptions });
    const preparedOptions = prepareOptions(newOptions);
    await Promise.all([
      LocalStorage.setItem(LOCAL_STORAGE_KEY.PASSWORD_OPTIONS, JSON.stringify(preparedOptions)),
      generatePassword(preparedOptions),
    ]);
  };

  const restoreStoredOptions = async () => {
    const newOptions = await getPasswordGeneratorOptions();
    dispatch({ type: "setOptions", options: newOptions });
    await generatePassword(newOptions);
  };

  useEffect(() => {
    void restoreStoredOptions();
  }, []);

  return { ...state, regeneratePassword, options, setOption };
}

export default usePasswordGenerator;
