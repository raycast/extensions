export const environment = {
  supportPath: "/tmp/raycast-support",
};

export const Toast = {
  Style: {
    Animated: "animated",
    Success: "success",
    Failure: "failure",
  },
};

export const Icon = new Proxy(
  {},
  {
    get: (_, property) => String(property),
  },
) as Record<string, string>;

export const Clipboard = {
  copy: async (_value: string) => undefined,
  readText: async () => null as string | null,
};

export async function showToast(options: Record<string, unknown>) {
  return {
    ...options,
    style: options.style,
    title: options.title,
    message: options.message,
  };
}

export async function open(..._args: unknown[]) {
  return undefined;
}

export function getPreferenceValues<T>() {
  return {} as T;
}

export async function getSelectedText() {
  return "";
}

const EmptyComponent = () => null;

export const Detail = EmptyComponent;
export const Grid = Object.assign(EmptyComponent, {
  Item: EmptyComponent,
});
export const List = Object.assign(EmptyComponent, {
  Item: Object.assign(EmptyComponent, {
    Detail: EmptyComponent,
  }),
});
export const ActionPanel = Object.assign(EmptyComponent, {
  Section: EmptyComponent,
});
export const Action = Object.assign(EmptyComponent, {
  ToggleQuickLook: EmptyComponent,
});
