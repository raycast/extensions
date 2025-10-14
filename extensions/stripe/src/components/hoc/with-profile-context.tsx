import React from "react";
import { ProfileProvider } from "@src/contexts";

/**
 * Higher-order component that wraps a component with ProfileProvider
 * This provides profile and environment context to all child components
 */
export const withProfileContext = <P extends object>(Component: React.FC<P>, options?: { skipGuide?: boolean }) => {
  return (props: P) => {
    return (
      <ProfileProvider skipGuide={options?.skipGuide}>
        <Component {...props} />
      </ProfileProvider>
    );
  };
};
