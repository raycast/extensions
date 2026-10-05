/**
 * React Context for bunq session management.
 *
 * This context eliminates prop drilling by providing session state
 * to all components in the tree. Components can access the session
 * using the useSession hook.
 *
 * @example
 * ```tsx
 * // In your command component:
 * export default function MyCommand() {
 *   return (
 *     <SessionProvider>
 *       <MyComponent />
 *     </SessionProvider>
 *   );
 * }
 *
 * // In any child component:
 * function MyComponent() {
 *   const { session, isReady } = useSession();
 *
 *   if (!isReady) return <List isLoading />;
 *
 *   // Use session.userId, session.getRequestOptions(), etc.
 * }
 * ```
 */

import { createContext, useContext, ReactNode } from "react";
import { useBunqSession, BunqSession } from "../hooks/useBunqSession";

/**
 * Session context value type.
 */
interface SessionContextValue {
  /** The bunq session state and methods */
  session: BunqSession;
  /** Whether the session is ready for API calls (loaded and configured) */
  isReady: boolean;
}

const SessionContext = createContext<SessionContextValue | null>(null);

/**
 * Props for the SessionProvider component.
 */
interface SessionProviderProps {
  children: ReactNode;
}

/**
 * Provides bunq session state to all child components.
 *
 * Wrap your command component with this provider to give all
 * descendants access to the session via the useSession hook.
 */
export function SessionProvider({ children }: SessionProviderProps) {
  const session = useBunqSession();

  const value: SessionContextValue = {
    session,
    isReady: session.isConfigured && !session.isLoading,
  };

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

/**
 * Hook to access the bunq session from any component.
 *
 * Must be used within a SessionProvider.
 *
 * @returns The session context value containing session state and isReady flag
 * @throws Error if used outside of a SessionProvider
 *
 * @example
 * ```tsx
 * function PaymentForm() {
 *   const { session, isReady } = useSession();
 *
 *   if (!isReady) {
 *     return <Form isLoading />;
 *   }
 *
 *   const handleSubmit = async () => {
 *     await createPayment(
 *       session.userId!,
 *       accountId,
 *       paymentData,
 *       session.getRequestOptions()
 *     );
 *   };
 *
 *   return <Form onSubmit={handleSubmit}>...</Form>;
 * }
 * ```
 */
export function useSession(): SessionContextValue {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error("useSession must be used within a SessionProvider");
  }
  return context;
}

/**
 * Hook to get just the session object (convenience wrapper).
 *
 * @returns The BunqSession object
 * @throws Error if used outside of a SessionProvider
 */
export function useSessionState(): BunqSession {
  const { session } = useSession();
  return session;
}

/**
 * Hook to check if the session is ready for API calls.
 *
 * @returns True if the session is loaded and configured
 * @throws Error if used outside of a SessionProvider
 */
export function useIsSessionReady(): boolean {
  const { isReady } = useSession();
  return isReady;
}
