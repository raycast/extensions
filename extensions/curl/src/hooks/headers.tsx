import { Action, ActionPanel, Icon } from "@raycast/api";
import { ReactElement } from "react";
import { v4 as uuidv4 } from "uuid";
import { Header } from "../types/headers";

export type UseEditableHeadersOptions = {
  headers: Record<string, Header>;
  setHeaders: React.Dispatch<React.SetStateAction<Record<string, Header>>>;
};

export type UseEditableHeaders = {
  isHeadersEmpty: boolean;
  addHeader: () => void;
  setHeaderKey: (id: string, key: string) => void;
  setHeaderValue: (id: string, value: string) => void;
  removeHeader: (id: string) => void;
  addHeaderAction: ReactElement;
  removeHeaderAction: ReactElement;
};

export function useEditableHeaders(options: UseEditableHeadersOptions): UseEditableHeaders {
  const { headers, setHeaders } = options;

  function addHeader() {
    const id = uuidv4();

    setHeaders((previous) => ({
      ...previous,
      [id]: {
        key: "",
        value: "",
      },
    }));
  }

  function setHeaderKey(id: string, key: string) {
    setHeaders((previous) => ({
      ...previous,
      [id]: {
        ...previous[id],
        key,
      },
    }));
  }

  function setHeaderValue(id: string, value: string) {
    setHeaders((previous) => ({
      ...previous,
      [id]: {
        ...previous[id],
        value,
      },
    }));
  }

  function removeHeader(id: string) {
    setHeaders((previous) => {
      const { [id]: _, ...rest } = previous;
      return rest;
    });
  }

  return {
    isHeadersEmpty: Object.keys(headers).length === 0,
    addHeader,
    setHeaderKey,
    setHeaderValue,
    removeHeader,
    addHeaderAction: (
      <Action
        key="add-header"
        title="Add Header"
        shortcut={{ modifiers: ["cmd"], key: "h" }}
        onAction={() => addHeader()}
      />
    ),
    removeHeaderAction: (
      <ActionPanel.Submenu
        key="remove-header-section"
        title="Remove Header"
        shortcut={{ modifiers: ["cmd", "shift"], key: "h" }}
      >
        {Object.entries(headers).map(([id, header]) => (
          <Action
            key={`remove-header-${id}`}
            title={`${header.key}: ${header.value}`}
            icon={Icon.Xmark}
            onAction={() => removeHeader(id)}
          />
        ))}
      </ActionPanel.Submenu>
    ),
  };
}
