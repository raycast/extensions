import { createContext } from "react";
import { DirectoryProps } from "../types";

const noop = () => undefined as any;

export interface AppContextType extends DirectoryProps {
  // actions:
  renderDirectory: (path: string) => void;
  shouldReRender: () => boolean;
  markFinishRenderingDirectory: () => void;
}

export const defaultAppContext: AppContextType = {
  path: "",
  // actions:
  renderDirectory: noop,
  /**
   * Check whether if they need to rerender with a path in React context or not.
   */
  shouldReRender: noop,
  /**
   * Mark a path is already used to render, so we won't use it again.
   * Caller can use `shouldReRender` function to check whether if they need to rerender with a path in React context or not.
   */
  markFinishRenderingDirectory: noop,
};

export const AppContext = createContext<AppContextType>(defaultAppContext);
