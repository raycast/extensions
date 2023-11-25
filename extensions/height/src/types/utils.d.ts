import { useCachedPromise } from "@raycast/utils";

export type Preferences = {
  apiResultsLimit: string;
};

export type ApiResponse<T> = {
  list: T;
};

export type ApiErrorResponse = {
  error: {
    name: string;
    type: string;
    status: number;
    message: string;
    attributes: unknown[];
    raw: boolean;
  };
};

export type UseCachedPromiseOptions<T> = Parameters<typeof useCachedPromise<T>>[2];

export type UseCachedPromiseMutatePromise<T> = ReturnType<typeof useCachedPromise<T>>["mutate"];

const HueArray = Array.from(Array(360).keys()) as const;

export type Hue = (typeof HueArray)[number];
