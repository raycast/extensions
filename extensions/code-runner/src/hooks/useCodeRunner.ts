// src/hooks/useCodeRunner.ts
import { useState, useEffect, useCallback } from "react";
import { showToast, Toast, LocalStorage } from "@raycast/api";
import { runCode, CodeExecutionResult, detectInstalledLanguages, DetectedLanguage } from "../utils/codeRunner";
import { showFailureToast } from "@raycast/utils";

const LANGUAGES_STORAGE_KEY = "detected_languages";
const LAST_USED_LANGUAGE_KEY = "lastUsedLanguage";

interface UseCodeRunnerReturn {
  code: string;
  language: string;
  result: CodeExecutionResult | null;
  availableLanguages: DetectedLanguage[];
  isInitializing: boolean;
  isExecutingCode: boolean;
  onCodeChange: (newCode: string) => void;
  onLanguageChange: (newValue: string) => void;
  onRunCode: () => Promise<void>;
  performLanguageDetection: (showLoadingToast?: boolean) => Promise<DetectedLanguage[] | null>;
}

export function useCodeRunner(): UseCodeRunnerReturn {
  const [code, setCode] = useState<string>("");
  const [language, setLanguage] = useState<string>("");
  const [result, setResult] = useState<CodeExecutionResult | null>(null);
  const [availableLanguages, setAvailableLanguages] = useState<DetectedLanguage[]>([]);
  const [isInitializing, setIsInitializing] = useState<boolean>(true);
  const [isExecutingCode, setIsExecutingCode] = useState<boolean>(false);

  // Function to get initial code based on the selected language.
  const getInitialCodeForLanguage = useCallback((langValue: string): string => {
    switch (langValue) {
      case "javascript":
        return `console.log("Hello from JavaScript!");\nlet a = 10;\nlet b = 20;\nconsole.log("Sum:", a + b);`;
      case "python":
        return `print("Hello from Python!")\nx = 5\ny = 3\nprint(f"Product: {x * y}")`;
      case "go":
        return `package main\n\nimport "fmt"\n\nfunc main() {\n    fmt.Println("Hello from Go!")\n    a, b := 7, 2\n    fmt.Printf("Division: %f\\n", float64(a) / float64(b))\n}`;
      case "swift":
        return `import Foundation\n\nprint("Hello from Swift!")\nlet num1: Double = 15.0\nlet num2: Double = 4.0\nprint("Result of division: \\(num1 / num2))")`;
      default:
        return "";
    }
  }, []);

  /**
   * Helper function to determine and set the current language and load its associated code.
   * This centralizes logic used by both initial setup and language re-detection.
   * @param detectedLanguages The array of languages detected on the system.
   */
  const handleLanguageSelection = useCallback(
    async (detectedLanguages: DetectedLanguage[]) => {
      // Determine the language to use: last used, or first detected
      const savedLanguage = await LocalStorage.getItem<string>(LAST_USED_LANGUAGE_KEY);
      const matchedLanguageValue =
        detectedLanguages.find((lang) => lang.value === savedLanguage)?.value ?? detectedLanguages[0].value;

      setLanguage(matchedLanguageValue);

      // Load saved code for the matched language, or use initial snippet
      const savedCode = await LocalStorage.getItem<string>(`code_${matchedLanguageValue}`);
      setCode(savedCode || getInitialCodeForLanguage(matchedLanguageValue));

      // Persist the last used language
      try {
        await LocalStorage.setItem(LAST_USED_LANGUAGE_KEY, matchedLanguageValue);
      } catch (storageError: unknown) {
        console.error(`[LocalStorage Error] Failed to set ${LAST_USED_LANGUAGE_KEY}:`, storageError);
      }
    },
    [getInitialCodeForLanguage],
  );

  const performLanguageDetection = useCallback(
    async (showLoadingToast: boolean = false): Promise<DetectedLanguage[] | null> => {
      setIsInitializing(true);
      let toast: Toast | undefined;
      let detectedLanguagesResult: DetectedLanguage[] | null = null;

      if (showLoadingToast) {
        toast = await showToast({
          style: Toast.Style.Animated,
          title: "Detecting languages...",
        });
      }

      try {
        const detected = await detectInstalledLanguages();
        setAvailableLanguages(detected);
        detectedLanguagesResult = detected;

        if (detected.length === 0) {
          setLanguage("");
          setCode("");
          showFailureToast(new Error("No supported languages found."), {
            title: "No supported languages found!",
            message: "Please ensure Node.js, Python3, Go, or Swift are installed and in your PATH.",
          });
          try {
            await LocalStorage.removeItem(LANGUAGES_STORAGE_KEY);
          } catch (storageError: unknown) {
            console.error(`[LocalStorage Error] Failed to remove ${LANGUAGES_STORAGE_KEY}:`, storageError);
          }
          return null;
        }

        try {
          await LocalStorage.setItem(LANGUAGES_STORAGE_KEY, JSON.stringify(detected));
        } catch (storageError: unknown) {
          console.error(`[LocalStorage Error] Failed to set ${LANGUAGES_STORAGE_KEY}:`, storageError);
        }

        await handleLanguageSelection(detected);

        if (toast) {
          toast.style = Toast.Style.Success;
          toast.title = "Languages detected!";
          toast.message = detected.length > 0 ? "Ready to run code." : "No supported languages found.";
        }
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);

        showFailureToast(error as Error, {
          title: "Language detection failed!",
          message: errorMessage || "An unknown error occurred during language detection.",
        });

        console.error("[Language Detection Error]", error);
        setLanguage("");
        setCode("");
        try {
          await LocalStorage.removeItem(LANGUAGES_STORAGE_KEY);
        } catch (storageError: unknown) {
          console.error(`[LocalStorage Error] Failed to remove ${LANGUAGES_STORAGE_KEY} on error:`, storageError);
        }
        return null;
      } finally {
        setIsInitializing(false);
      }
      return detectedLanguagesResult;
    },
    [handleLanguageSelection],
  );

  useEffect(() => {
    async function initializeExtension() {
      setIsInitializing(true);

      const toast = await showToast({
        style: Toast.Style.Animated,
        title: "Initializing...",
      });

      try {
        let cachedLanguages: string | undefined;
        try {
          cachedLanguages = await LocalStorage.getItem<string>(LANGUAGES_STORAGE_KEY);
        } catch (storageError: unknown) {
          console.error(`[LocalStorage Error] Failed to get ${LANGUAGES_STORAGE_KEY}:`, storageError);
        }

        let initializationSuccess = false;

        if (cachedLanguages) {
          try {
            const parsedDetected = JSON.parse(cachedLanguages);
            if (Array.isArray(parsedDetected) && parsedDetected.length > 0) {
              setAvailableLanguages(parsedDetected);
              await handleLanguageSelection(parsedDetected);
              initializationSuccess = true;
            } else {
              console.log("[Initialization] Cached languages array is empty, performing fresh detection.");
              const freshDetectedResult = await performLanguageDetection(false);
              initializationSuccess = Boolean(freshDetectedResult && freshDetectedResult.length > 0);
            }
          } catch (parseError: unknown) {
            console.error("[LocalStorage Parse Error]", parseError);
            toast.title = "Failed to load cached languages. Re-detecting...";
            const freshDetectedResult = await performLanguageDetection(false);
            initializationSuccess = Boolean(freshDetectedResult && freshDetectedResult.length > 0);
          }
        } else {
          console.log("[Initialization] No cached languages found, performing initial detection.");
          const freshDetectedResult = await performLanguageDetection(false);
          initializationSuccess = Boolean(freshDetectedResult && freshDetectedResult.length > 0);
        }

        if (initializationSuccess) {
          toast.style = Toast.Style.Success;
          toast.title = "Initialization complete!";
          toast.message = "Ready to run code.";
        } else {
          showFailureToast({
            title: "Initialization failed!",
            message:
              "No supported languages found. Please ensure Node.js, Python3, Go, or Swift are installed and in your PATH.",
          });
        }
      } catch (error: unknown) {
        showFailureToast(error as Error, {
          title: "Initialization failed!",
          message: "An unknown error occurred during initialization.",
        });
        console.error("[Initialization Error]", error);
        setLanguage("");
        setCode("");
      } finally {
        setIsInitializing(false);
      }
    }

    initializeExtension();
  }, [performLanguageDetection, handleLanguageSelection]);

  const onRunCode = useCallback(async () => {
    setIsExecutingCode(true);
    setResult(null);

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Running code...",
    });

    try {
      if (!code.trim()) {
        showFailureToast({ title: "No code provided!", message: "Please enter some code to run." });
        return;
      }

      if (!language) {
        showFailureToast({ title: "No language selected!", message: "Please select a language before running code." });
        return;
      }
      const executionResult = await runCode(language, code);
      setResult(executionResult);

      console.log(`[CodeRunner] Command Executed: ${executionResult.command}`);

      if (executionResult.error) {
        showFailureToast(executionResult.error, { title: "Code execution failed!", message: executionResult.error });
      } else {
        toast.style = Toast.Style.Success;
        toast.title = "Code executed successfully!";
        toast.message = "Output displayed below.";
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      showFailureToast(error, { title: "Failed to run code!", message: errorMessage || "An unknown error occurred." });
      setResult({ stdout: "", stderr: "", error: errorMessage || "Unknown error", command: null });
    } finally {
      setIsExecutingCode(false);
    }
  }, [code, language]);

  const onLanguageChange = useCallback(
    async (newValue: string) => {
      if (newValue === "detect-new-languages") {
        await performLanguageDetection(true);
        return;
      }

      if (newValue === "detect-new-languages") {
        await performLanguageDetection(true);
        return;
      }

      setLanguage(newValue);
      setResult(null);

      let savedCode: string | undefined;
      try {
        savedCode = await LocalStorage.getItem<string>(`code_${newValue}`);
      } catch (storageError: unknown) {
        console.error(`[LocalStorage Error] Failed to get code_${newValue}:`, storageError);
      }

      try {
        await LocalStorage.setItem(`code_${language}`, code);
      } catch (storageError: unknown) {
        console.error(`[LocalStorage Error] Failed to set code_${language}:`, storageError);
      }

      setLanguage(newValue);
      setResult(null);

      try {
        savedCode = await LocalStorage.getItem<string>(`code_${newValue}`);
      } catch (storageError: unknown) {
        console.error(`[LocalStorage Error] Failed to get code_${newValue}:`, storageError);
      }
      setCode(savedCode || getInitialCodeForLanguage(newValue));

      try {
        await LocalStorage.setItem(LAST_USED_LANGUAGE_KEY, newValue);
      } catch (storageError: unknown) {
        console.error(`[LocalStorage Error] Failed to set ${LAST_USED_LANGUAGE_KEY}:`, storageError);
      }
    },
    [code, language, getInitialCodeForLanguage, performLanguageDetection],
  );

  const onCodeChange = useCallback(
    async (newCode: string) => {
      setCode(newCode);
      if (language) {
        try {
          await LocalStorage.setItem(`code_${language}`, newCode);
        } catch (storageError: unknown) {
          console.error(`[LocalStorage Error] Failed to set code_${language}:`, storageError);
        }
      }
    },
    [language],
  );

  return {
    code,
    language,
    result,
    availableLanguages,
    isInitializing,
    isExecutingCode,
    onCodeChange,
    onLanguageChange,
    onRunCode,
    performLanguageDetection,
  };
}
