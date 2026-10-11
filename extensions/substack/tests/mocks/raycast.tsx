/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState } from "react";
import { vi } from "vitest";

export const storage = new Map<string, string>();
export const cache = new Map<string, any>();
export const LocalStorage = {
  getItem: vi.fn(async (key: string) => storage.get(key)),
  setItem: vi.fn(async (key: string, value: string) => {
    storage.set(key, value);
  }),
};
export const Clipboard = { copy: vi.fn(async (_content: string) => {}) };
export const open = vi.fn(async (_url: string) => {});
export const push = vi.fn();
export const pop = vi.fn();
export const showToast = vi.fn(async () => {});
export const getPreferenceValues = vi.fn(() => ({}));
export const launchCommand = vi.fn();
export const confirmAlert = vi.fn(async () => true);
export const useNavigation = () => ({ push, pop });
export const Icon = new Proxy({}, { get: (_, key) => String(key) });
export const Keyboard = {
  Shortcut: {
    Common: {
      New: { modifiers: ["cmd"], key: "n" },
      Edit: { modifiers: ["cmd"], key: "e" },
      Open: { modifiers: ["cmd"], key: "o" },
      Refresh: { modifiers: ["cmd"], key: "r" },
      Copy: { modifiers: ["cmd", "shift"], key: "c" },
      Remove: { modifiers: ["ctrl"], key: "x" },
    },
  },
};
export const Color = { Red: "red" };
export const Toast = { Style: { Failure: "failure", Success: "success" } };
export const Alert = { ActionStyle: { Destructive: "destructive" } };
export const LaunchType = { UserInitiated: "user" };
function Container(p: any) {
  return (
    <div>
      {p.children}
      {p.actions}
    </div>
  );
}
function Button(p: any) {
  return <button onClick={p.onAction}>{p.title}</button>;
}
export const Action = Object.assign(Button, {
  Style: { Destructive: "destructive" },
  SubmitForm: (p: any) => <button onClick={() => p.onSubmit()}>{p.title}</button>,
  OpenInBrowser: (p: any) => <button onClick={() => open(p.url)}>{p.title}</button>,
  CopyToClipboard: (p: any) => <button data-content={p.content}>{p.title}</button>,
  Push: (p: any) => {
    const [shown, setShown] = useState(false);
    return (
      <>
        <button
          onClick={() => {
            push(p.target);
            setShown(true);
          }}
        >
          {p.title}
        </button>
        {shown && (
          <div>
            {p.target}
            <button
              onClick={() => {
                setShown(false);
                p.onPop?.();
              }}
            >
              Back
            </button>
          </div>
        )}
      </>
    );
  },
});
export const ActionPanel = Object.assign(Container, { Section: Container });
function Dropdown(p: any) {
  return (
    <label>
      {p.title ?? p.tooltip}
      <select
        aria-label={p.title ?? p.tooltip}
        value={p.value}
        defaultValue={p.value === undefined ? p.defaultValue : undefined}
        onChange={(e) => p.onChange?.(e.target.value)}
      >
        {p.children}
      </select>
    </label>
  );
}
Dropdown.Item = (p: any) => <option value={p.value}>{p.title}</option>;
function Field(p: any) {
  return (
    <label>
      {p.title}
      <input
        aria-label={p.title}
        type={p.password ? "password" : "text"}
        value={p.value ?? ""}
        onChange={(e) => p.onChange?.(e.target.value)}
      />
      {p.error && <span role="alert">{p.error}</span>}
    </label>
  );
}
export const Form = Object.assign(
  (p: any) => (
    <div aria-label="form" data-loading={!!p.isLoading}>
      {p.children}
      {p.actions}
    </div>
  ),
  {
    TextField: Field,
    TextArea: (p: any) => (
      <label>
        {p.title}
        <textarea aria-label={p.title} value={p.value ?? ""} onChange={(e) => p.onChange?.(e.target.value)} />
        {p.error && <span role="alert">{p.error}</span>}
      </label>
    ),
    PasswordField: (p: any) => <Field {...p} password />,
    FilePicker: (p: any) => (
      <label>
        {p.title}
        <input aria-label={p.title} onChange={(e) => p.onChange(e.target.value ? [e.target.value] : [])} />
      </label>
    ),
    Description: (p: any) => (
      <div>
        {p.title}
        {p.text}
      </div>
    ),
    Dropdown,
  },
);
const Metadata = Object.assign(Container, {
  Link: (p: any) => (
    <a href={p.target}>
      {p.title}
      {p.text}
    </a>
  ),
  Label: (p: any) => (
    <span>
      {p.title}
      {p.text}
    </span>
  ),
});
const ItemDetail = Object.assign(
  (p: any) => (
    <div>
      {p.markdown}
      {p.metadata}
    </div>
  ),
  { Metadata },
);
export const List = Object.assign(
  (p: any) => (
    <div aria-label="list" data-loading={!!p.isLoading} data-details={!!p.isShowingDetail}>
      <input aria-label="Search" onChange={(e) => p.onSearchTextChange?.(e.target.value)} />
      {p.searchBarAccessory}
      {p.children}
      {p.actions}
      {p.pagination?.hasMore && <button onClick={p.pagination.onLoadMore}>Load More</button>}
    </div>
  ),
  {
    Item: Object.assign(
      (p: any) => (
        <article>
          <h3>{p.title}</h3>
          {p.subtitle}
          {p.accessories?.map((a: any, i: number) => (
            <span key={i}>{a.tag ?? a.text}</span>
          ))}
          {p.detail}
          {p.actions}
        </article>
      ),
      { Detail: ItemDetail },
    ),
    Section: (p: any) => <section aria-label={p.title}>{p.children}</section>,
    EmptyView: (p: any) => (
      <div>
        {p.title}
        {p.description}
        {p.actions}
      </div>
    ),
    Dropdown,
  },
);
export const Detail = (p: any) => (
  <div data-loading={!!p.isLoading}>
    {p.markdown}
    {p.actions}
  </div>
);
