import { useRef } from "react";
import { getPreferenceValues } from "@raycast/api";
import { GoogleGenerativeAI } from "@google/generative-ai";
import './fetch';


export default function useAIModel() {
  const modelRef = useRef(null);

  if (modelRef.current === null) {
    const pref = getPreferenceValues();
    const genAI = new GoogleGenerativeAI(pref["apiKey"]);
    modelRef.current = genAI.getGenerativeModel({ model: pref["model"] });
  }

  return modelRef.current;
}
