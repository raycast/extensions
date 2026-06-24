export const PopToRootType = { Suspended: "suspended" };

export const Toast = {
  Style: {
    Animated: "animated",
    Failure: "failure",
    Success: "success",
  },
};

export async function closeMainWindow() {
  return undefined;
}

export async function open() {
  return undefined;
}

export async function showToast(toast: { style: string; title: string; message?: string }) {
  return { ...toast };
}
