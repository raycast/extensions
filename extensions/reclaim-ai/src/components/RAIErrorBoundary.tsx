import { ErrorBoundary, ErrorBoundaryProps } from "@sentry/react";
import { ComponentType, FC } from "react";


export type RAIErrorBoundaryProps = ErrorBoundaryProps;

export const RAIErrorBoundary: FC<RAIErrorBoundaryProps> = ({ children, ...rest }) => {
  return <ErrorBoundary {...rest}>{children}</ErrorBoundary>;
};

export const withRAIErrorBoundary = <P extends Record<string, unknown>>(
  WrappedComponent: ComponentType<P>,
  errorBoundaryOptions: RAIErrorBoundaryProps
): FC<P> => {
  const componentDisplayName = WrappedComponent.displayName || WrappedComponent.name || "unknown";

  const Wrapped: React.FC<P> = (props: P) => (
    <RAIErrorBoundary {...errorBoundaryOptions}>
      <WrappedComponent {...props} />
    </RAIErrorBoundary>
  );

  Wrapped.displayName = `raiErrorBoundary(${componentDisplayName})`;

  return Wrapped;
};
