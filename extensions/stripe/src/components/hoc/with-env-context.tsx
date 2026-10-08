import { useState } from "react";
import type { Environment } from "@src/types";
import { EnvironmentContext } from "@src/contexts";

/**
 * Higher-order component that provides environment (test/live) context to a component.
 *
 * Wraps a component with EnvironmentContext.Provider, allowing the component
 * and its children to access and switch between test and live Stripe environments.
 *
 * @param Component - The component to wrap with environment context
 * @returns Wrapped component with environment state management
 *
 * @deprecated This HOC is deprecated in favor of using ProfileContext which includes
 * environment management. Use `withProfileContext` instead.
 *
 * @example
 * ```tsx
 * const MyComponent = () => {
 *   const { environment, setEnvironment } = useEnvContext();
 *   return <div>Current: {environment}</div>;
 * };
 *
 * export default withEnvContext(MyComponent);
 * ```
 */
export const withEnvContext = <P extends object>(Component: React.FC<P>) => {
  return (props: P) => {
    const [environment, setEnvironment] = useState<Environment>("live");
    return (
      <EnvironmentContext.Provider value={{ environment, setEnvironment }}>
        <Component {...props} />
      </EnvironmentContext.Provider>
    );
  };
};
