import { Detail, getSelectedText, getPreferenceValues } from "@raycast/api";
import { useState, useEffect, useMemo } from "react";
import axios from "axios";
const usePreferences = () => {
  return useMemo(() => getPreferenceValues(), []);
};
export default function Command() {
  const [result, setResult] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const preferences = usePreferences();
  const onSearchTextChange = async (e: string) => {
    const res = await axios({
      method: "post",
      url: "https://wudao.aminer.cn/os/api/api/v2/multilingual_code_explain",
      data: {
        n: 1,
        prompt: e,
        lang: preferences.language,
        locale: preferences.comment,
        apikey: preferences.apikey,
        apisecret: preferences.apisecret,
      },
    });
    setResult(`\`\`\`js
${res.data.result.output.code.join("")}
\`\`\`
`);
    setIsLoading(false);
  };
  const readSelectedText = async () => {
    try {
      const selectedText = await getSelectedText();
      await onSearchTextChange(selectedText);
    } catch (error) {
      setResult("Please select some text");
    }
  };
  useEffect(() => {
    readSelectedText();
  }, []);

  return <Detail markdown={result} isLoading={isLoading} />;
}
