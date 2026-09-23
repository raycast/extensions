export type RefreshOptions = {
  followUp?: boolean;
};

export function createRefreshQueue(
  load: () => Promise<void>,
): (options?: RefreshOptions) => Promise<void>;
