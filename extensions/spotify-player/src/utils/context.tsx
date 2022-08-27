import { useContext, useEffect, useState, createContext } from "react";
import { isAuthorized } from "../spotify/oauth";
import { isSpotifyInstalled } from ".";

type ProviderProps = { children: React.ReactNode };
interface ContextState {
  installed: boolean | null;
  authorized: boolean;
}

const defaultState: ContextState = {
  installed: null,
  authorized: false,
};

const SpotifyContext = createContext<ContextState>(defaultState);

function SpotifyProvider({ children }: ProviderProps) {
  const [state, setState] = useState<ContextState>(defaultState);

  const checkIfInstalled = async () => {
    const installed = await isSpotifyInstalled();
    const authorized = await isAuthorized();

    setState({
      installed,
      authorized,
    });
  };

  useEffect(() => {
    checkIfInstalled();
  }, []);

  return <SpotifyContext.Provider value={state}>{children}</SpotifyContext.Provider>;
}

function useSpotify() {
  const context = useContext(SpotifyContext);
  if (context === undefined) {
    throw new Error("useSpotify must be used within a SpotifyProvider");
  }
  return context;
}

export { SpotifyProvider, useSpotify };
