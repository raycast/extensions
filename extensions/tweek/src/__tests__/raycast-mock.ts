export const Color = {
  PrimaryText: "PrimaryText",
  SecondaryText: "SecondaryText",
  Green: "Green",
  Red: "Red",
  Blue: "Blue",
  Yellow: "Yellow",
  Orange: "Orange",
  Purple: "Purple",
};

export const Icon = {
  CheckCircle: "CheckCircle",
  Circle: "Circle",
  CircleFilled: "CircleFilled",
  Calendar: "Calendar",
  Repeat: "Repeat",
  CheckList: "CheckList",
  Trash: "Trash",
  Filter: "Filter",
  RotateAntiClockwise: "RotateAntiClockwise",
  Eye: "Eye",
  EyeDisabled: "EyeDisabled",
};

export const Action = Object.assign(() => null, {
  Style: {
    Regular: "regular",
    Destructive: "destructive",
  },
  Push: () => null,
  CopyToClipboard: () => null,
  OpenInBrowser: () => null,
  SubmitForm: () => null,
});

export const ActionPanel = Object.assign(() => null, {
  Section: () => null,
  Submenu: () => null,
});

export const List = Object.assign(() => null, {
  Section: () => null,
  Item: Object.assign(() => null, {
    Detail: Object.assign(() => null, {
      Metadata: Object.assign(() => null, {
        TagList: Object.assign(() => null, {
          Item: () => null,
        }),
        Label: () => null,
        Separator: () => null,
      }),
    }),
  }),
  Dropdown: Object.assign(() => null, {
    Section: () => null,
    Item: () => null,
  }),
  EmptyView: () => null,
});

export const Toast = {
  Style: {
    Animated: "Animated",
    Success: "Success",
    Failure: "Failure",
  },
};

export async function showToast() {
  return { style: "", title: "", message: "" };
}

export function getPreferenceValues() {
  return {
    apiKey: "test_api_key_123",
    dateFormat: "dd/MM/yyyy",
    weekStartsOn: "Monday",
    defaultTaskColor: "blank",
    hideCompleted: false,
  };
}

export class Cache {
  private map = new Map<string, string>();
  get(key: string) {
    return this.map.get(key);
  }
  set(key: string, val: string) {
    this.map.set(key, val);
  }
  remove(key: string) {
    this.map.delete(key);
  }
  clear() {
    this.map.clear();
  }
}
