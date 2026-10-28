import { useState } from "react";

export const useCachedState = <T>(_key: string, initialValue: T) => useState(initialValue);
export const failures: unknown[] = [];
export async function showFailureToast(error: unknown) {
  failures.push(error);
}
