import { List } from "@raycast/api";
import { btoaPolyfill } from "js-base64";
import { useState } from "react";
import { ActionListSection } from "./components/ActionListSection";

export default function Command() {
  const [inputText, setInputText] = useState("");
  return (
    <List searchText={inputText} onSearchTextChange={setInputText} searchBarPlaceholder="Input String">
      <ActionListSection title="URL Encode" text={encodeURIComponent(inputText)} />
      <ActionListSection title="Base64 Encode" text={btoaPolyfill(inputText)} />
    </List>
  );
}
