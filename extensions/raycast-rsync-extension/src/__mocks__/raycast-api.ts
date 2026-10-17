import React from "react";
import { vi } from "vitest";

export const List = Object.assign(
  ({ children, ...props }: any) =>
    React.createElement("div", { "data-testid": "list", ...props }, children),
  {
    Item: ({ title, subtitle, actions, ...props }: any) =>
      React.createElement(
        "div",
        {
          "data-testid": "list-item",
          "data-title": title,
          "data-subtitle": subtitle,
          ...props,
        },
        actions,
      ),
    EmptyView: ({ title, description }: any) =>
      React.createElement("div", {
        "data-testid": "empty-view",
        "data-title": title,
        "data-description": description,
      }),
  },
);

export const Form = Object.assign(
  ({ children, actions }: any) =>
    React.createElement("div", { "data-testid": "form" }, children, actions),
  {
    Description: ({ title, text }: any) =>
      React.createElement("div", {
        "data-testid": "form-description",
        "data-title": title,
        "data-text": text,
      }),
    TextField: ({ id, title, value, onChange }: any) =>
      React.createElement("input", {
        "data-testid": `form-field-${id}`,
        "data-title": title,
        value: value,
        onChange: (e: any) => onChange?.(e.target.value),
      }),
    Separator: () =>
      React.createElement("hr", { "data-testid": "form-separator" }),
  },
);

export const ActionPanel = ({ children }: any) =>
  React.createElement("div", { "data-testid": "action-panel" }, children);

export const Action = ({ title, onAction }: any) =>
  React.createElement(
    "button",
    {
      "data-testid": `action-${title?.toLowerCase().replace(/\s+/g, "-")}`,
      onClick: onAction,
    },
    title,
  );

export const showToast = vi.fn();
export const getSelectedFinderItems = vi.fn();
export const getPreferenceValues = vi.fn();

export const Icon = {
  CheckCircle: "check-circle",
  ArrowClockwise: "arrow-clockwise",
  Upload: "upload",
  Download: "download",
  Document: "document",
  ArrowLeft: "arrow-left",
  MagnifyingGlass: "magnifying-glass",
  Trash: "trash",
};

export const Toast = {
  Style: {
    Success: "success",
    Failure: "failure",
    Animated: "animated",
  },
};
