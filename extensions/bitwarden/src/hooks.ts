import { LocalStorage, confirmAlert, Icon, popToRoot, getPreferenceValues, environment } from "@raycast/api";
import { useState, useEffect, useRef, useReducer } from "react";
import { Bitwarden } from "./api";
import { DEFAULT_PASSWORD_OPTIONS, LOCAL_STORAGE_KEY } from "./const";
import { PasswordGeneratorOptions, PasswordHistoryItem, Preferences } from "./types";
import { existsSync, mkdirSync, appendFileSync, readFileSync } from "fs";
import { createCipheriv, createHash, randomBytes, createDecipheriv } from "crypto";
import { join as pathJoin } from "path/posix";
import { EOL } from "os";

export const usePasswordHistory = () => {
  const { clientId } = getPreferenceValues<Preferences>();
  const { encrypt, decrypt } = useContentEncryptor();

  const getEncryptedEntry = (password: string) => {
    const encryptedData = encrypt(password);
    return `${encryptedData.content},${encryptedData.iv},${Date.now()}${EOL}`;
  };

  const getDecryptedEntry = (entry: string): PasswordHistoryItem | null => {
    const [content, iv, timestamp] = entry.split(",");
    if (!content || !iv || !timestamp) return null;
    return { password: decrypt({ content, iv }), timestamp: Number(timestamp) };
  };

  const save = (password: string) => {
    try {
      if (!clientId) throw "Missing client_id";
      const directoryPath = pathJoin(environment.supportPath, "history");
      const filePath = pathJoin(directoryPath, clientId.trim());
      if (!existsSync(directoryPath)) mkdirSync(directoryPath, { recursive: true });
      appendFileSync(filePath, getEncryptedEntry(password), { encoding: "utf-8" });
    } catch (error) {
      console.error("Failed save password to history file", error);
    }
  };

  const getAll = () => {
    try {
      if (!clientId) throw "Missing client_id";
      const filePath = pathJoin(environment.supportPath, "history", clientId.trim());
      const fileContent = readFileSync(filePath, { encoding: "utf-8" });
      const decryptedEntries = fileContent.split(/\r?\n/).reduce((acc, entry) => {
        if (!entry) return acc;
        const decryptedEntry = getDecryptedEntry(entry);
        if (decryptedEntry) acc.push(decryptedEntry);
        return acc;
      }, [] as PasswordHistoryItem[]);
      return decryptedEntries;
    } catch (error) {
      console.error("Failed read password history file", error);
    }
  };

  return { save, getAll };
};

const initialState = {
  password: undefined as string | undefined,
  isGenerating: false,
};

type State = typeof initialState;

type Action =
  | { type: "generate" }
  | { type: "setPassword"; password: string }
  | { type: "fail" }
  | { type: "clear"; password: string };

const passwordReducer = (state: State, action: Action): State => {
  switch (action.type) {
    case "generate":
      return { ...state, isGenerating: true };
    case "setPassword":
      return { password: action.password, isGenerating: false };
    case "fail":
      return { ...state, isGenerating: false };
    case "clear":
      return { isGenerating: false, password: undefined };
  }
};

export function usePasswordGenerator(
  bitwardenApi: Bitwarden,
  options: PasswordGeneratorOptions | undefined,
  hookOptions?: { regenerateOnOptionChange: boolean }
) {
  const { regenerateOnOptionChange = true } = hookOptions ?? {};
  const [state, dispatch] = useReducer(passwordReducer, initialState);
  const { save } = usePasswordHistory();

  const generatePassword = async () => {
    try {
      if (state.isGenerating) return;
      dispatch({ type: "generate" });
      const password = await bitwardenApi.generatePassword(options);
      dispatch({ type: "setPassword", password });
      await save(password);
    } catch (error) {
      dispatch({ type: "fail" });
    }
  };

  useEffect(() => {
    if (!regenerateOnOptionChange || !options) return;
    generatePassword();
  }, [options]);

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

  const restoreStoredOptions = async () => {
    const storedOptions = await LocalStorage.getItem<string>(LOCAL_STORAGE_KEY.PASSWORD_OPTIONS);
    const newOptions = { ...DEFAULT_PASSWORD_OPTIONS, ...(storedOptions ? JSON.parse(storedOptions) : {}) };
    setOptions(newOptions);
  };

  useEffect(() => {
    restoreStoredOptions();
  }, []);

  return { options, setOption };
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

type EncryptedContent = { iv: string; content: string };

const get32BitSecretKeyBuffer = (key: string) =>
  Buffer.from(createHash("sha256").update(key).digest("base64").slice(0, 32));

export const useContentEncryptor = () => {
  const { clientSecret } = getPreferenceValues<Preferences>();
  const cipherKeyBuffer = useRef<Buffer>(get32BitSecretKeyBuffer(clientSecret.trim()));

  useEffect(() => {
    cipherKeyBuffer.current = get32BitSecretKeyBuffer(clientSecret.trim());
  }, [clientSecret]);

  function encrypt(data: string): EncryptedContent {
    const ivBuffer = randomBytes(16);
    const cipher = createCipheriv("aes-256-cbc", cipherKeyBuffer.current, ivBuffer);
    const encryptedContentBuffer = Buffer.concat([cipher.update(data), cipher.final()]);
    return { iv: ivBuffer.toString("hex"), content: encryptedContentBuffer.toString("hex") };
  }

  function decrypt(data: EncryptedContent) {
    const decipher = createDecipheriv("aes-256-cbc", cipherKeyBuffer.current, Buffer.from(data.iv, "hex"));
    const decryptedContentBuffer = Buffer.concat([decipher.update(Buffer.from(data.content, "hex")), decipher.final()]);
    return decryptedContentBuffer.toString();
  }

  return { encrypt, decrypt };
};
