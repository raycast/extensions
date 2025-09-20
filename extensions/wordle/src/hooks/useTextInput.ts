import { useState } from "react";

export type UseTextInputReturnType = {
  state: [string, React.Dispatch<React.SetStateAction<string>>];
  isEmpty: boolean;
  length: number;
  hasCorrectLength: boolean;
};

export const useTextInput = (correctLength?: number): UseTextInputReturnType => {
  const [textInput, setTextInput] = useState("");

  const isEmpty = !textInput;
  const length = textInput.length;
  const hasCorrectLength = length === correctLength;

  return { state: [textInput, setTextInput], isEmpty, length, hasCorrectLength };
};
