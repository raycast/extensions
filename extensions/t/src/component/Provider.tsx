import { FunctionComponent, useCallback } from "react";
import { MessageContext, Messanger } from "../context/MessageContext";
import { en, ko, Message, MessageMap } from "../message";
import { getPreferenceValues } from "@raycast/api";
import { Preference, PreferenceContext } from "../context/PreferenceContext";

export const Provider: FunctionComponent = (props) => {
  const preferenceValues = getPreferenceValues<Preference>();
  const { target } = preferenceValues;
  console.log(target)
  const map: MessageMap = all[target as keyof typeof all] ?? all["en"];
  const m = useCallback<Messanger>((m) => map[m(Message)], [map, target]);

  return (
    <PreferenceContext.Provider value={preferenceValues}>
      <MessageContext.Provider value={m}>{props.children}</MessageContext.Provider>
    </PreferenceContext.Provider>
  );
};
const all = { en, ko };
