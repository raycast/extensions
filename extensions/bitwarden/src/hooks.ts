import {
  getLocalStorageItem,
  showToast,
  ToastStyle,
  removeLocalStorageItem,
  setLocalStorageItem,
  LocalStorage,
  confirmAlert,
  Icon,
  popToRoot,
} from "@raycast/api";
import { useState, useEffect, useReducer } from "react";
import { Bitwarden } from "./api";
import { DEFAULT_PASSWORD_OPTIONS, LOCAL_STORAGE_KEY, SESSION_KEY } from "./const";
import { PasswordGeneratorOptions, VaultStatus } from "./types";

async function login(api: Bitwarden) {
  try {
    const toast = await showToast(ToastStyle.Animated, "Logging in...", "It may take some time");
    await api.login();
    toast.hide();
  } catch (error) {
    showToast(ToastStyle.Failure, "An error occurred during login!", "Please check your credentials");
  }
}

export function useBitwarden(
  bitwardenApi: Bitwarden
): [{ sessionToken?: string; vaultStatus?: VaultStatus }, (sessionToken: string | null) => void] {
  const [state, setState] = useState<{ sessionToken?: string; vaultStatus?: VaultStatus }>({});

  useEffect(() => {
    async function getSessionToken() {
      const sessionToken = await getLocalStorageItem<string>(SESSION_KEY);

      const status = await bitwardenApi.status(sessionToken);

      switch (status) {
        case "unlocked":
          setState({ sessionToken: sessionToken, vaultStatus: "unlocked" });
          break;
        case "locked":
          setState({ vaultStatus: "locked" });
          break;
        case "unauthenticated":
          await login(bitwardenApi);
          setState({ vaultStatus: "locked" });
      }
    }
    getSessionToken();
  }, []);

  return [
    state,
    async (sessionToken: string | null) => {
      if (sessionToken) {
        setLocalStorageItem(SESSION_KEY, sessionToken);
        setState({ sessionToken, vaultStatus: "unlocked" });
      } else {
        removeLocalStorageItem(SESSION_KEY);
        setState({ vaultStatus: "locked" });
      }
    },
  ];
}

const initialState = {
  password: undefined as string | undefined,
  isGenerating: false,
};

type State = typeof initialState;

type Action =
  | { type: "generate" }
  | { type: "setPassword"; password: string }
  | { type: "failure" }
  | { type: "clear"; password: string };

const passwordReducer = (state: State, action: Action): State => {
  switch (action.type) {
    case "generate":
      return { ...state, isGenerating: true };
    case "setPassword":
      return { password: action.password, isGenerating: false };
    case "failure":
      return { ...state, isGenerating: false };
    case "clear":
      return { isGenerating: false, password: undefined };
  }
};

export function usePasswordGenerator(bitwardenApi: Bitwarden) {
  const { getUpdatedOptions } = usePasswordOptions();
  const [state, dispatch] = useReducer(passwordReducer, initialState);

  const generatePassword = async () => {
    try {
      dispatch({ type: "generate" });
      const options = await getUpdatedOptions();
      const password = await bitwardenApi.generatePassword(options);
      dispatch({ type: "setPassword", password });
    } catch (error) {
      dispatch({ type: "failure" });
    }
  };

  useEffect(() => {
    generatePassword();
  }, []);

  return { ...state, regeneratePassword: generatePassword };
}

export const usePasswordOptions = () => {
  const [options, setOptions] = useState<PasswordGeneratorOptions>();

  const setOption = async <Option extends keyof PasswordGeneratorOptions>(
    option: Option,
    value: PasswordGeneratorOptions[Option]
  ) => {
    if (!options || options[option] === value) return;
    const newOptions = { ...options, [option]: value };
    setOptions(newOptions);
    await LocalStorage.setItem(LOCAL_STORAGE_KEY.PASSWORD_OPTIONS, JSON.stringify(newOptions));
  };

  const getUpdatedOptions = async () => {
    const storedOptions = await LocalStorage.getItem<string>(LOCAL_STORAGE_KEY.PASSWORD_OPTIONS);
    const newOptions = { ...DEFAULT_PASSWORD_OPTIONS, ...(storedOptions ? JSON.parse(storedOptions) : {}) };
    return newOptions;
  };

  const restoreStoredOptions = async () => {
    setOptions(await getUpdatedOptions());
  };

  useEffect(() => {
    restoreStoredOptions();
  }, []);

  return { options, setOption, getUpdatedOptions };
};

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
