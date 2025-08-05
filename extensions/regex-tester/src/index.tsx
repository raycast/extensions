import { useCallback, useState } from "react";
import { LocalStorage, useNavigation } from "@raycast/api";
import FormScreen, { TestStringFormValues } from "./screens/FormScreen";
import { useAsync } from "react-async-hook";
import MainScreen from "./screens/MainScreen";

export default function Command() {
  const [testString, setTestString] = useState("");
  const [source, setSource] = useState<string | undefined>();
  const { push } = useNavigation();

  useAsync(async () => {
    if (source === "new") {
      const newString = { id: Date.now().toString(), value: testString };
      const previousItem = await LocalStorage.getItem<string>("test-string-history");
      if (previousItem) {
        const previousStrings = JSON.parse(previousItem);
        const nextStrings = [newString, ...previousStrings].slice(0, 5);
        await LocalStorage.setItem("test-string-history", JSON.stringify(nextStrings));
      } else {
        await LocalStorage.setItem("test-string-history", JSON.stringify([newString]));
      }
    }
  }, [source]);

  const handleSubmit = useCallback((values: TestStringFormValues) => {
    setTestString(values.text);
    setSource(values.source);
    push(<MainScreen testString={values.text} />);
  }, []);

  return <FormScreen onSubmit={handleSubmit} />;
}
