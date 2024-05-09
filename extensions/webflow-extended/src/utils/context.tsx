import { useContext, useEffect, useState, createContext } from "react";
import { isAuthorized } from "../webflow/oauth";

type ProviderProps = { children: React.ReactNode };
interface ContextState {
  authorized: boolean;
}

const defaultState: ContextState = {
  authorized: false,
};

const WebflowContext = createContext<ContextState>(defaultState);

function WebflowProvider({ children }: ProviderProps) {
  const [state, setState] = useState<ContextState>(defaultState);

  const checkIfAuthorized = async () => {
    const authorized = await isAuthorized();

    setState({
      authorized,
    });
  };

  useEffect(() => {
    checkIfAuthorized();
  }, []);

  return <WebflowContext.Provider value={state}>{children}</WebflowContext.Provider>;
}

function useWebflow() {
  const context = useContext(WebflowContext);
  if (context === undefined) {
    throw new Error("useWebflow must be used within a WebflowProvider");
  }
  return context;
}

export { WebflowProvider, useWebflow };
