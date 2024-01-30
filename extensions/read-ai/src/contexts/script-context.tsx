import React, { createContext, useContext, useState, ReactNode } from "react";

interface ScriptContextType {
  script: string;
  setScript: (script: string) => void;
}

const ScriptContext = createContext<ScriptContextType | undefined>(undefined);

export const useScript = () => {
  const context = useContext(ScriptContext);
  if (!context) {
    throw new Error("useScript must be used within a ScriptProvider");
  }
  return context;
};

export const ScriptProvider = ({ children }: { children: ReactNode }) => {
  const [script, setScript] = useState("");

  return <ScriptContext.Provider value={{ script, setScript }}>{children}</ScriptContext.Provider>;
};
