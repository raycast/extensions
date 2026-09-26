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
};

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
