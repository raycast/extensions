/**
 * @raycast/api のモック
 * テスト環境でのみ使用
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import React from "react";

// モックコンポーネント
export const List = ({ children, isLoading, ...props }: any) =>
  React.createElement(
    "div",
    { "data-isloading": isLoading, ...props },
    children,
  );

List.Item = ({
  title,
  subtitle,
  accessories,
  actions,
  children,
  ...props
}: any) => {
  const content = [
    title &&
      React.createElement(
        "span",
        { "data-testid": "list-item-title", key: "title" },
        title,
      ),
    subtitle &&
      React.createElement(
        "span",
        { "data-testid": "list-item-subtitle", key: "subtitle" },
        subtitle,
      ),
    ...(accessories || []).map((acc: any, i: number) =>
      React.createElement(
        "span",
        { "data-testid": `accessory-${i}`, key: `accessory-${i}` },
        acc.text,
      ),
    ),
    actions,
    children,
  ].filter(Boolean);

  return React.createElement(
    "div",
    { "data-title": title, "data-subtitle": subtitle, ...props },
    ...content,
  );
};

List.Section = ({ title, children, ...props }: any) => {
  const content = [
    title &&
      React.createElement(
        "span",
        { "data-testid": "section-title", key: "section-title" },
        title,
      ),
    children,
  ].filter(Boolean);

  return React.createElement(
    "div",
    { "data-title": title, ...props },
    ...content,
  );
};

export const Action = ({
  title,
  onAction,
  shortcut,
  children,
  ...props
}: any) =>
  React.createElement(
    "button",
    {
      "data-title": title,
      onClick: onAction,
      "data-shortcut": shortcut ? JSON.stringify(shortcut) : undefined,
      ...props,
    },
    title || children,
  );

export const ActionPanel = ({ children, ...props }: any) =>
  React.createElement("div", { role: "menu", ...props }, children);

// Preferences API のモック
export const getPreferenceValues = () => ({
  language: "ja",
});

// その他必要なエクスポートがあればここに追加
