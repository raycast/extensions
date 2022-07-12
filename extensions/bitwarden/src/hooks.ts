import { LocalStorage, confirmAlert, Icon, popToRoot, closeMainWindow, Alert } from "@raycast/api";
import { useEffect, useReducer, useRef, useState } from "react";
import { Bitwarden } from "./api";
import { DEFAULT_PASSWORD_OPTIONS, LOCAL_STORAGE_KEY } from "./const";
import { PasswordGeneratorOptions, VaultState } from "./types";
import { getServerUrlPreference } from "./utils";

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

export function usePasswordGenerator(bitwardenApi: Bitwarden) {
  const [{ options, ...state }, dispatch] = useReducer(passwordReducer, initialPasswordGeneratorState);
  const { abortControllerRef, renew: renewAbortController, abort: abortPreviousGenerate } = useAbortController();

  const generatePassword = async (passwordOptions = options) => {
    try {
      renewAbortController();
      dispatch({ type: "generate" });
      const password = await bitwardenApi.generatePassword(passwordOptions, abortControllerRef?.current);
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
    const storedOptions = await LocalStorage.getItem<string>(LOCAL_STORAGE_KEY.PASSWORD_OPTIONS);
    const newOptions = { ...DEFAULT_PASSWORD_OPTIONS, ...(storedOptions ? JSON.parse(storedOptions) : {}) };
    dispatch({ type: "setOptions", options: newOptions });
    await generatePassword(newOptions);
  };

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

export function useVaultMessages(bitwardenApi: Bitwarden): {
  userMessage: string;
  serverMessage: string;
  shouldShowServer: boolean;
} {
  const [vaultState, setVaultState] = useState<VaultState | null>(null);

  useEffect(() => {
    bitwardenApi.status().then((vaultState) => {
      setVaultState(vaultState);
    });
  }, []);

  const shouldShowServer = !!getServerUrlPreference();

  let userMessage = "...";
  let serverMessage = "...";

  if (vaultState) {
    const { status, userEmail, serverUrl } = vaultState;
    userMessage = status == "unauthenticated" ? "Logged out" : `Locked (${userEmail})`;
    if (serverUrl) {
      serverMessage = serverUrl || "";
    } else if ((!serverUrl && shouldShowServer) || (serverUrl && !shouldShowServer)) {
      // Hosted state not in sync with CLI (we don't check for equality)
      confirmAlert({
        icon: Icon.ExclamationMark,
        title: "Restart Required",
        message: "Bitwarden server URL preference has been changed since the extension was opened.",
        primaryAction: {
          title: "Close Extension",
        },
        dismissAction: {
          title: "Close Raycast", // Only here to provide the necessary second option
          style: Alert.ActionStyle.Cancel,
        },
      }).then((closeExtension) => {
        if (closeExtension) {
          popToRoot();
        } else {
          closeMainWindow();
        }
      });
    }
  }

  return { userMessage, serverMessage, shouldShowServer };
}
