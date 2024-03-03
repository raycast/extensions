import React from "react";

import { useErrorBoundary, useExitCommand, useMount, useRunCommand, RunCommandProps } from "../hooks";
import { ScriptType } from "../core";
import { renderSubComponent } from "../utils";

import { IdleScreen, IdleStop } from "./IdleScreen";

export type ItermCommandProps = {
  title: string;
  sequence?: boolean;
  errorTitle: string;
  showToast?: boolean;
  exitOnSuccess?: boolean;
  onError?: (e: Error) => unknown;
  onSuccess?: (stdout: string[]) => unknown;
  onComplete?: (status: boolean) => unknown;
  scripts: RunCommandProps["scripts"];
  scriptType: ScriptType;
  children?: (items: string[]) => React.ReactNode;
};

export const ItermCommand: React.FC<ItermCommandProps> = ({
  title,
  errorTitle,
  exitOnSuccess,
  sequence,
  onError,
  onSuccess,
  onComplete,
  scriptType,
  scripts,
  children,
}) => {
  const isMounted = useMount();
  const { ErrorBoundary, error, onDidCatch } = useErrorBoundary();
  const [stepsLog, setStepsLog] = React.useState(title);
  const [result, setResult] = React.useState<string[] | null>(null);

  const errorCallback = React.useCallback(
    (e: Error) => {
      onError?.(e);
      onDidCatch(e);
    },
    [onDidCatch, setResult, onError],
  );

  const successCallback = React.useCallback((stdout: string[]) => {
    try {
      setResult(stdout);
      onSuccess?.(stdout);
    } catch (_) {
      const err = _ as Error;
      onDidCatch(err);
    }
  }, []);

  const completeCallback = React.useCallback(
    (status: boolean) => {
      onComplete?.(status);
    },
    [onComplete],
  );

  const task = useRunCommand({
    disabled: !isMounted,
    sequence,
    onError: errorCallback,
    onSuccess: successCallback,
    onComplete: completeCallback,
    logger: setStepsLog,
    scripts,
    type: scriptType,
  });

  useExitCommand(task.complete && error === null && exitOnSuccess !== false);

  if (task.complete && result !== null && children) {
    return <IdleStop>{renderSubComponent(result, children)}</IdleStop>;
  }

  return (
    <ErrorBoundary toastErrorTitle={errorTitle}>
      <IdleScreen pending={!task.complete} title={title} stepsLog={task.pending ? stepsLog : null} />
    </ErrorBoundary>
  );
};

export const ASItermCommand: React.FC<Omit<ItermCommandProps, "scriptType">> = (props) => {
  return <ItermCommand {...props} scriptType={ScriptType.applescript} />;
};

export const PythonItermCommand: React.FC<Omit<ItermCommandProps, "scriptType">> = (props) => {
  return <ItermCommand {...props} scriptType={ScriptType.python} />;
};
