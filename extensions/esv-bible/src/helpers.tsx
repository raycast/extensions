import { ReactElement } from "react";

interface KeyedAction {
  key: string;
  element: ReactElement;
}

export function reorderActions(actions: KeyedAction[], preferredKey: string): ReactElement[] {
  const preferred = actions.find((a) => a.key === preferredKey);
  const rest = actions.filter((a) => a.key !== preferredKey);
  if (preferred) {
    return [preferred.element, ...rest.map((a) => a.element)];
  }
  return actions.map((a) => a.element);
}
