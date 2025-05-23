// hooks/useCodeRunner.ts
import { useState, useEffect, useCallback } from "react";
import { showToast, Toast, LocalStorage } from "@raycast/api";
import { runCode, CodeExecutionResult, detectInstalledLanguages, DetectedLanguage } from "../utils/codeRunner";

// LocalStorage Key for storing detected languages
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
  performLanguageDetection: (showLoadingToast?: boolean) => Promise<void>; // Expose for retry button
}

export function useCodeRunner(): UseCodeRunnerReturn {
  const [code, setCode] = useState<string>("");
  const [language, setLanguage] = useState<string>("");
  const [result, setResult] = useState<CodeExecutionResult | null>(null);
  const [availableLanguages, setAvailableLanguages] = useState<DetectedLanguage[]>([]);
  const [isInitializing, setIsInitializing] = useState<boolean>(true); // Tracks initial setup and re-detection
  const [isExecutingCode, setIsExecutingCode] = useState<boolean>(false); // Tracks only code execution

  // Function to get initial code based on the selected language.
  const getInitialCodeForLanguage = useCallback((langValue: string): string => {
    switch (langValue) {
      case "javascript":
        return `console.log("Hello from JavaScript!");\nlet a = 10;\nlet b = 20;\nconsole.log("Sum:", a + b);`;
      case "python":
        return `print("Hello from Python!")\nx = 5\ny = 3\nprint(f"Product: {x * y}")`;
      case "go":
        return `package main\n\nimport "fmt"\n\nfunc main() {\n    fmt.Println("Hello from Go!")\n    a, b := 7, 2\n    fmt.Printf("Division: %f\\n", float64(a) / float64(b))\n}`;
      default:
        return "";
    }
  }, []); // Memoize as it doesn't depend on any state

  /**
   * Performs the language detection and updates state and local storage.
   * This is used for initial load and explicit "Detect New Languages" action.
   * @param showLoadingToast Whether to show a toast message during detection.
   */
  const performLanguageDetection = useCallback(
    async (showLoadingToast: boolean = false) => {
      setIsInitializing(true); // Set initializing to true
      let toast: Toast | undefined;

      if (showLoadingToast) {
        toast = await showToast({
          style: Toast.Style.Animated,
          title: "Detecting languages...",
        });
      }

      try {
        const detected = await detectInstalledLanguages();
        setAvailableLanguages(detected);

        if (detected.length === 0) {
          setLanguage(""); // No language selected if none detected
          setCode(""); // Ensure code is empty if no languages
          if (toast) {
            toast.style = Toast.Style.Failure;
            toast.title = "No supported languages found!";
            toast.message = "Please ensure Node.js, Python3, or Go are installed and in your PATH.";
          }
          await LocalStorage.removeItem(LANGUAGES_STORAGE_KEY); // Clear stale language cache
          return;
        }

        await LocalStorage.setItem(LANGUAGES_STORAGE_KEY, JSON.stringify(detected));

        // Determine the language to use after detection: last used, or first detected
        const savedLanguage = await LocalStorage.getItem<string>(LAST_USED_LANGUAGE_KEY);
        const matchedLanguageValue = detected.find((lang) => lang.value === savedLanguage)?.value ?? detected[0].value;

        setLanguage(matchedLanguageValue);

        // Load saved code for the matched language, or use initial snippet
        const savedCode = await LocalStorage.getItem<string>(`code_${matchedLanguageValue}`);
        setCode(savedCode || getInitialCodeForLanguage(matchedLanguageValue));

        await LocalStorage.setItem(LAST_USED_LANGUAGE_KEY, matchedLanguageValue);

        if (toast) {
          toast.style = Toast.Style.Success;
          toast.title = "Languages detected!";
          toast.message = detected.length > 0 ? "Ready to run code." : "No supported languages found.";
        }
      } catch (error: unknown) {
        // Changed 'any' to 'unknown'
        const errorMessage = error instanceof Error ? error.message : String(error);
        if (toast) {
          toast.style = Toast.Style.Failure;
          toast.title = "Language detection failed!";
          toast.message = errorMessage || "An unknown error occurred during language detection.";
        }
        console.error("[Language Detection Error]", error);
        setLanguage("");
        setCode("");
        await LocalStorage.removeItem(LANGUAGES_STORAGE_KEY); // Clear stale language cache on error
      } finally {
        setIsInitializing(false); // Always set initializing to false at the end of detection
      }
    },
    [getInitialCodeForLanguage],
  ); // Memoize, depends on getInitialCodeForLanguage

  // Effect to initialize the extension: load languages from cache or detect
  useEffect(() => {
    async function initializeExtension() {
      setIsInitializing(true); // Ensure initializing state is active

      const toast = await showToast({
        style: Toast.Style.Animated,
        title: "Initializing...",
      });

      try {
        const cachedLanguages = await LocalStorage.getItem<string>(LANGUAGES_STORAGE_KEY);
        let detected: DetectedLanguage[] = [];

        if (cachedLanguages) {
          try {
            detected = JSON.parse(cachedLanguages);
            setAvailableLanguages(detected);
            if (detected.length > 0) {
              const savedLanguage = await LocalStorage.getItem<string>(LAST_USED_LANGUAGE_KEY);
              const matchedLanguageValue =
                detected.find((lang) => lang.value === savedLanguage)?.value ?? detected[0].value;
              setLanguage(matchedLanguageValue);
              const savedCode = await LocalStorage.getItem<string>(`code_${matchedLanguageValue}`);
              setCode(savedCode || getInitialCodeForLanguage(matchedLanguageValue));
              await LocalStorage.setItem(LAST_USED_LANGUAGE_KEY, matchedLanguageValue);
              toast.style = Toast.Style.Success;
              toast.title = "Languages loaded from cache!";
              toast.message = "Enter code and run.";
            } else {
              // Cache was empty or invalid, trigger a fresh detection
              console.log("[Initialization] Cached languages array is empty, performing fresh detection.");
              await performLanguageDetection(false);
            }
          } catch (parseError: unknown) {
            // Changed 'any' to 'unknown'
            console.error("[LocalStorage Parse Error]", parseError);
            toast.style = Toast.Style.Failure;
            toast.title = "Failed to load cached languages. Re-detecting...";
            await performLanguageDetection(false); // Trigger detection if parsing fails
          }
        } else {
          // No cached languages, perform initial detection
          console.log("[Initialization] No cached languages found, performing initial detection.");
          await performLanguageDetection(false);
        }
      } catch (error: unknown) {
        // Changed 'any' to 'unknown'
        const errorMessage = error instanceof Error ? error.message : String(error);
        toast.style = Toast.Style.Failure;
        toast.title = "Initialization failed!";
        toast.message = errorMessage || "An unknown error occurred during initialization.";
        console.error("[Initialization Error]", error);
        setLanguage("");
        setCode("");
      } finally {
        setIsInitializing(false); // Always set initializing to false at the end of initialization
      }
    }

    initializeExtension();
  }, [performLanguageDetection, getInitialCodeForLanguage]); // Dependencies for useEffect

  /**
   * Handles the execution of the code.
   * Displays toast messages for loading, success, or error.
   * Updates the result state to display output directly in the form.
   */
  const onRunCode = useCallback(async () => {
    setIsExecutingCode(true); // Set executing code to true
    setResult(null); // Clear previous results before new execution

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Running code...",
    });

    try {
      if (!code.trim()) {
        toast.style = Toast.Style.Failure;
        toast.title = "No code provided!";
        toast.message = "Please enter some code to run.";
        return;
      }

      const executionResult = await runCode(language, code);
      setResult(executionResult); // Set the result to be displayed

      // Log the command executed for development purposes
      console.log(`[CodeRunner] Command Executed: ${executionResult.command}`);

      if (executionResult.error) {
        toast.style = Toast.Style.Failure;
        toast.title = "Code execution failed!";
        toast.message = executionResult.error;
      } else {
        toast.style = Toast.Style.Success;
        toast.title = "Code executed successfully!";
        toast.message = "Output displayed below.";
      }
    } catch (error: unknown) {
      // Changed 'any' to 'unknown'
      const errorMessage = error instanceof Error ? error.message : String(error);
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to run code!";
      toast.message = errorMessage || "An unknown error occurred.";
      // Set an error result object in case of an uncaught exception during runCode
      setResult({ stdout: "", stderr: "", error: errorMessage || "Unknown error", command: null });
    } finally {
      setIsExecutingCode(false); // Always set executing code to false
    }
  }, [code, language]); // Dependencies for onRunCode

  /**
   * Updates the code example when the language selection changes, or triggers re-detection.
   */
  const onLanguageChange = useCallback(
    async (newValue: string) => {
      if (newValue === "detect-new-languages") {
        await performLanguageDetection(true); // Trigger re-detection with toast
        return; // Do not proceed with language change logic
      }

      // Save current code before changing language
      await LocalStorage.setItem(`code_${language}`, code);
      setLanguage(newValue);
      setResult(null); // Clear results when language changes

      // Load saved code for the new language, or set to default example
      const savedCode = await LocalStorage.getItem<string>(`code_${newValue}`);
      setCode(savedCode || getInitialCodeForLanguage(newValue)); // Use saved code or default
      await LocalStorage.setItem(LAST_USED_LANGUAGE_KEY, newValue); // Save to storage
    },
    [code, language, getInitialCodeForLanguage, performLanguageDetection],
  ); // Dependencies for onLanguageChange

  /**
   * Handles code changes in the TextArea.
   * Saves the code to local storage.
   */
  const onCodeChange = useCallback(
    async (newCode: string) => {
      setCode(newCode);
      await LocalStorage.setItem(`code_${language}`, newCode); // Persist code for current language
    },
    [language],
  ); // Dependency for onCodeChange

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
