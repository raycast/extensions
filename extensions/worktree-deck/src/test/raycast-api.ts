/**
 * テスト用の素通しコンポーネントを作る
 */
function createPassthroughComponent(_name: string) {
  void _name;
  return function PassthroughComponent(_props: unknown) {
    void _props;
    return null;
  };
}

/**
 * テスト用の Action モック
 */
export const Action = {
  Push: createPassthroughComponent("Action.Push"),
  SubmitForm: createPassthroughComponent("Action.SubmitForm"),
} as const;

/**
 * テスト用の ActionPanel モック
 */
export const ActionPanel = createPassthroughComponent("ActionPanel");

/**
 * テスト用の Icon モック
 */
export const Icon = {
  Gear: "gear",
  Folder: "folder",
  SaveDocument: "saveDocument",
} as const;

/**
 * テスト用の List モック
 */
export const List = Object.assign(createPassthroughComponent("List"), {
  Section: createPassthroughComponent("List.Section"),
  Item: createPassthroughComponent("List.Item"),
});

/**
 * テスト用の Form モック
 */
export const Form = Object.assign(createPassthroughComponent("Form"), {
  Dropdown: Object.assign(createPassthroughComponent("Form.Dropdown"), {
    Item: createPassthroughComponent("Form.Dropdown.Item"),
  }),
});

/**
 * テスト用の Toast モック
 */
export const Toast = {
  Style: {
    Failure: "failure",
    Success: "success",
  },
} as const;

/**
 * テスト用の toast 表示関数
 */
export async function showToast(_args: unknown): Promise<void> {
  void _args;
}

/**
 * テスト用の navigation hook
 */
export function useNavigation() {
  return {
    pop: () => undefined,
  };
}

/**
 * テスト用の LocalStorage モック
 */
export const LocalStorage = {
  /**
   * 値を取得する
   */
  async getItem<T>(_key: string): Promise<T | null> {
    void _key;
    return null;
  },
  /**
   * 値を保存する
   */
  async setItem(_key: string, _value: string): Promise<void> {
    void _key;
    void _value;
    return;
  },
};
