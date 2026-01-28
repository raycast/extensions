import { captureException } from "@sentry/node";
import { ComponentType, FC } from "react";
import { ErrorBoundary, ErrorBoundaryProps } from "react-error-boundary";
import { useCallbackSafeRef } from "../hooks/useCallbackSafeRef";

export type RAIErrorBoundaryProps = Omit<ErrorBoundaryProps, "fallbackRender"> & {
  fallbackRender: NonNullable<ErrorBoundaryProps["fallbackRender"]>;
};

export const RAIErrorBoundary: FC<RAIErrorBoundaryProps> = ({ children, onError, ...rest }) => {
  const handleError = useCallbackSafeRef<NonNullable<ErrorBoundaryProps["onError"]>>((error, ...args) => {
    captureException(error);
    return onError?.(error, ...args);
  });

  return (
    <ErrorBoundary onError={handleError} {...(rest as ErrorBoundaryProps)}>
      {children}
    </ErrorBoundary>
  );
};

export const withRAIErrorBoundary = <P extends Record<string, unknown>>(
  WrappedComponent: ComponentType<P>,
  errorBoundaryOptions?: Partial<RAIErrorBoundaryProps>
): FC<P> => {
  const componentDisplayName = WrappedComponent.displayName || WrappedComponent.name || "[[unknown]]";

  const Wrapped: React.FC<P> = (props: P) => (
    <RAIErrorBoundary
      fallbackRender={() => <>Something went wrong! Please contact support.</>}
      {...errorBoundaryOptions}
    >
      <WrappedComponent {...props} />
    </RAIErrorBoundary>
  );

  Wrapped.displayName = `raiErrorBoundary(${componentDisplayName})`;

  return Wrapped;
};
