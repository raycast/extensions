import { useLocalStorage } from "./useLocalStorage";

export type PostCreateActionScope = "create-form" | "quick-add" | "all";

export type PostCreateAction = {
  id: string;
  shortcutIdentifier: string;
  shortcutName: string;
  enabled: boolean;
  scope: PostCreateActionScope;
};

export const STORAGE_KEY = "post-create-shortcut-actions";

export const postCreateActionScopeOptions: { value: PostCreateActionScope; title: string }[] = [
  { value: "all", title: "All Create Flows" },
  { value: "create-form", title: "Create Reminder Only" },
  { value: "quick-add", title: "Quick Add Only" },
];

function isPostCreateAction(value: unknown): value is PostCreateAction {
  return (
    typeof value === "object" &&
    value !== null &&
    "id" in value &&
    "shortcutIdentifier" in value &&
    "shortcutName" in value &&
    "enabled" in value &&
    "scope" in value &&
    typeof value.id === "string" &&
    typeof value.shortcutIdentifier === "string" &&
    typeof value.shortcutName === "string" &&
    typeof value.enabled === "boolean" &&
    (value.scope === "create-form" || value.scope === "quick-add" || value.scope === "all")
  );
}

export function normalizePostCreateActions(actions: unknown[] | undefined): PostCreateAction[] {
  const seen = new Set<string>();

  return (actions ?? []).filter((item): item is PostCreateAction => {
    if (!isPostCreateAction(item)) {
      return false;
    }

    if (seen.has(item.id)) {
      return false;
    }

    seen.add(item.id);
    return true;
  });
}

export default function usePostCreateActions() {
  const storage = useLocalStorage<PostCreateAction[]>(STORAGE_KEY, []);

  return {
    ...storage,
    value: normalizePostCreateActions(storage.value),
  };
}
