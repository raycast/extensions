import { LocalStorage, getPreferenceValues, environment } from "@raycast/api";
import { useState, useEffect, useReducer, useMemo } from "react";
import { Bitwarden } from "./api";
import { DEFAULT_PASSWORD_OPTIONS, LOCAL_STORAGE_KEY } from "./const";
import { PasswordGeneratorOptions, PasswordHistoryItem, PasswordType, Preferences } from "./types";
import { existsSync, readFileSync, writeFileSync } from "fs";
import { createCipheriv, createHash, randomBytes, createDecipheriv } from "crypto";
import { join as pathJoin } from "path/posix";
import { generateMd5Hash } from "./utils";

const MAX_HISTORY_ITEMS = 100;

export const usePasswordHistory = () => {
  const { clientId } = getPreferenceValues<Preferences>();
  const { encrypt, decrypt } = useContentEncryptor();

  const historyFile = useMemo(() => {
    const name = generateMd5Hash(clientId.trim());
    const path = pathJoin(environment.supportPath, `password-history-${name}.json`);
    return { name, path };
  }, [clientId]);

  const getEncryptedEntry = (password: string, type?: PasswordType) => {
    const encryptedData = encrypt(password);
    const typeNumber = type === "passphrase" ? 1 : 0;
    return `${typeNumber},${encryptedData.content},${encryptedData.iv},${new Date().toISOString()}`;
  };

  const getDecryptedEntry = (entry: string): PasswordHistoryItem | null => {
    const [typeNumber, content, iv, datetime] = entry.split(",");
    const type = typeNumber === "1" ? "passphrase" : "password";
    if (!content || !iv || !datetime) return null;
    return { type, password: decrypt({ content, iv }), datetime };
  };

  const save = (password: string, type?: PasswordType) => {
    const fileData = [getEncryptedEntry(password, type)];
    if (existsSync(historyFile.path)) {
      try {
        const fileContents = JSON.parse(readFileSync(historyFile.path, { encoding: "utf-8" })) as string[];
        Array.prototype.push.apply(fileData, fileContents);
        if (fileData.length >= MAX_HISTORY_ITEMS) fileData.pop();
      } catch (error) {
        // ignore, the write below will overwrite the file
      }
    }
    writeFileSync(historyFile.path, JSON.stringify(fileData), { encoding: "utf-8" });
  };

  const getAll = () => {
    try {
      const fileContent = JSON.parse(readFileSync(historyFile.path, { encoding: "utf-8" })) as string[];
      const decryptedEntries = fileContent.reduce((acc, entry) => {
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

  const clear = () => {
    try {
      writeFileSync(historyFile.path, JSON.stringify([]), { encoding: "utf-8" });
    } catch (error) {
      console.error("Failed clear password history file", error);
    }
  };

  return { save, getAll, clear };
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
      save(password, options?.passphrase ? "passphrase" : "password");
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

type EncryptedContent = { iv: string; content: string };

const get32BitSecretKeyBuffer = (key: string) =>
  Buffer.from(createHash("sha256").update(key).digest("base64").slice(0, 32));

export const useContentEncryptor = () => {
  const { clientSecret } = getPreferenceValues<Preferences>();
  const cipherKeyBuffer = useMemo(() => get32BitSecretKeyBuffer(clientSecret.trim()), [clientSecret]);

  const encrypt = (data: string): EncryptedContent => {
    const ivBuffer = randomBytes(16);
    const cipher = createCipheriv("aes-256-cbc", cipherKeyBuffer, ivBuffer);
    const encryptedContentBuffer = Buffer.concat([cipher.update(data), cipher.final()]);
    return { iv: ivBuffer.toString("hex"), content: encryptedContentBuffer.toString("hex") };
  };

  const decrypt = (data: EncryptedContent): string => {
    const decipher = createDecipheriv("aes-256-cbc", cipherKeyBuffer, Buffer.from(data.iv, "hex"));
    const decryptedContentBuffer = Buffer.concat([decipher.update(Buffer.from(data.content, "hex")), decipher.final()]);
    return decryptedContentBuffer.toString();
  };

  return { encrypt, decrypt };
};
