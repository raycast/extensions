// Taken from `@types/index.d.ts` in `node-fetch`
// <https://github.com/node-fetch/node-fetch>.
//
// Copyright (c) 2016 - 2020 Node Fetch Team
// Licensed under the MIT License (<https://github.com/node-fetch/node-fetch/blob/main/LICENSE.md>)
export type AbortSignal = {
  readonly aborted: boolean;

  addEventListener: (type: "abort", listener: (this: AbortSignal) => void) => void;
  removeEventListener: (type: "abort", listener: (this: AbortSignal) => void) => void;
};
