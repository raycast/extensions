import { Clipboard, showToast, Toast, getSelectedText } from "@raycast/api";
import { useState, useEffect } from "react";
export function useSelect({ onSearchTextChange, setCode }: any) {
  // TODO 除了从select，还可以从剪切板
  const readSelectedText = async () => {
    try {
      const selectedText = await getSelectedText();
      await onSearchTextChange(selectedText);
    } catch (error) {
      setCode("There is no selected text, you can bind this command to the shortcut key");
    }
  };
  useEffect(() => {
    readSelectedText();
  }, []);
}
export function useSearch({ generatePrompt, api }: any) {
  const [code, setCode] = useState<string>("");
  const [rawCode, setRawCode] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  let toast;
  const onSearchTextChange = async (e: string) => {
    if (e.trim() === "") {
      return;
    }
    const prompt = generatePrompt?.(e) ?? e;
    toast = await showToast({
      style: Toast.Style.Animated,
      title: "Loading...",
    });
    setIsLoading(true);
    try {
      const res = await api(prompt);
      if (res.data.status === 0) {
        const codes = res.data.result.output.code.join("");
        setCode(`\`\`\`
  ${codes}
  \`\`\`
  `);
        setRawCode(codes);
        toast.style = Toast.Style.Success;
        toast.title = "Success";
      } else {
        setCode(res.data.message);
        toast.style = Toast.Style.Failure;
        toast.title = res.data.message;
      }
    } catch (error: any) {
      toast.style = Toast.Style.Failure;
      toast.title = error.message || "Something went wrong, please try again";
      setCode(error.message || "Something went wrong, please try again");
    } finally {
      setIsLoading(false);
    }
  };
  return { onSearchTextChange, code, rawCode, isLoading, setCode, setRawCode };
}
export async function onCopy({ rawCode }: { rawCode: string }) {
  if (rawCode.trim() === "") return;
  await Clipboard.copy(rawCode);
  await showToast({
    style: Toast.Style.Success,
    title: "Copy Success",
  });
}
