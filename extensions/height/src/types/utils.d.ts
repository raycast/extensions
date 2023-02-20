import { useFetch } from "@raycast/utils";

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

export type UseFetchParams<T> = Parameters<typeof useFetch<T>>[1];

const HueArray = Array.from(Array(360).keys()) as const;

export type Hue = (typeof HueArray)[number];
