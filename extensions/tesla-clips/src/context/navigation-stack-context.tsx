/**
 * React context that shares command-level navigation with nested review screens.
 *
 * @module context/navigation-stack-context
 */

import { createContext, useContext, type ReactElement, type ReactNode } from "react";
import type { CommandNavigation } from "../hooks/use-command-navigation";

const NavigationStackContext = createContext<CommandNavigation | null>(null);

/** Props for {@link NavigationStackProvider}. */
type NavigationStackProviderProps = {
  readonly navigation: CommandNavigation;
  readonly children: ReactNode;
};

/**
 * Supplies {@link CommandNavigation} to descendant hooks and components.
 *
 * @param props - `navigation` from {@link useCommandNavigation} and child tree.
 * @returns Provider element wrapping `children`.
 */
export function NavigationStackProvider({ navigation, children }: NavigationStackProviderProps) {
  return <NavigationStackContext.Provider value={navigation}>{children}</NavigationStackContext.Provider>;
}

/**
 * Reads the navigation stack from context.
 *
 * @returns Active {@link CommandNavigation} instance.
 * @throws If used outside {@link NavigationStackProvider}.
 */
export function useNavigationStack(): CommandNavigation {
  const context = useContext(NavigationStackContext);
  if (!context) {
    throw new Error("useNavigationStack must be used within NavigationStackProvider");
  }
  return context;
}

/**
 * Wraps a pushed view so nested screens can call {@link useNavigationStack}.
 *
 * @param navigation - Command-level navigation API.
 * @param component - Screen element to render inside the provider.
 * @returns Element tree with navigation context attached.
 */
export function wrapWithNavigationStack(navigation: CommandNavigation, component: ReactElement): ReactElement {
  return <NavigationStackProvider navigation={navigation}>{component}</NavigationStackProvider>;
}
