import React from 'react';
export const state = {
  pops: 0,
  pushes: [] as React.ReactElement[],
  raw: undefined as string | undefined,
  confirmation: false,
  confirmations: 0,
  preferences: {} as Record<string, string>,
  toasts: [] as {
    style: string;
    title: string;
    message?: string;
    hide: () => Promise<void>;
  }[],
};
export function reset() {
  state.pops = 0;
  state.pushes = [];
  state.raw = undefined;
  state.confirmation = false;
  state.confirmations = 0;
  state.preferences = {};
  state.toasts = [];
}
function component(name: string) {
  return (props: Record<string, unknown>) =>
    React.createElement(
      name,
      props,
      props.children as React.ReactNode,
      props.actions as React.ReactNode,
      props.metadata as React.ReactNode,
    );
}
export const Action = Object.assign(component('Action'), {
  SubmitForm: component('SubmitForm'),
  Push: component('Push'),
  CopyToClipboard: component('CopyToClipboard'),
  Paste: component('Paste'),
  Style: { Destructive: 'destructive' },
});
export const ActionPanel = Object.assign(component('ActionPanel'), {
  Section: component('Section'),
});
export const Form = Object.assign(component('Form'), {
  TextField: component('TextField'),
  Description: component('Description'),
  Dropdown: Object.assign(component('Dropdown'), {
    Item: component('DropdownItem'),
  }),
});
export const Detail = Object.assign(component('Detail'), {
  Metadata: Object.assign(component('Metadata'), {
    Label: component('MetadataLabel'),
    TagList: Object.assign(component('TagList'), { Item: component('Tag') }),
  }),
});
export const List = Object.assign(component('List'), {
  Item: component('ListItem'),
  EmptyView: component('EmptyView'),
});
export const Icon = new Proxy({}, { get: (_, key) => String(key) });
export const Image = { Mask: { RoundedRectangle: 'rounded' } };
export const Toast = {
  Style: { Success: 'success', Failure: 'failure', Animated: 'animated' },
};
export const Alert = { ActionStyle: { Destructive: 'destructive' } };
export const Keyboard = {};
export const useNavigation = () => ({
  pop: () => {
    state.pops++;
  },
  push: (element: React.ReactElement) => {
    state.pushes.push(element);
  },
});
export const LocalStorage = {
  getItem: async () => state.raw,
  setItem: async (_: string, raw: string) => {
    state.raw = raw;
  },
};
export const Clipboard = {
  readText: async () => '',
  copy: async () => undefined,
};
export const getPreferenceValues = () => state.preferences;
export async function showToast(options: {
  style: string;
  title: string;
  message?: string;
}) {
  const toast = { ...options, hide: async () => undefined };
  state.toasts.push(toast);
  return toast;
}
export async function confirmAlert() {
  state.confirmations++;
  return state.confirmation;
}
