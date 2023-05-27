import { List } from "@raycast/api";
import { atobPolyfill } from "js-base64";
import { useState } from "react";
import { ActionListSection } from "./components/ActionListSection";

function safeDecodeBase64(input: string) {
  try {
    return atobPolyfill(input);
  } catch (e) {
    return "not a base64 encoded string";
  }
}

function safeDecodeURI(input: string) {
  try {
    return decodeURIComponent(input);
  } catch (e) {
    return "not a url encoded string";
  }
}

export default function Command() {
  const [inputText, setInputText] = useState("");
  return (
    <List searchText={inputText} onSearchTextChange={setInputText} searchBarPlaceholder="Input String">
      <ActionListSection title="URL Decode" text={safeDecodeURI(inputText)} />
      <ActionListSection title="Base64 Decode" text={safeDecodeBase64(inputText)} />
    </List>
  );
}
