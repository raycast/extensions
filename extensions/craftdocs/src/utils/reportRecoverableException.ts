import * as RaycastAPI from "@raycast/api";

type RaycastApiWithCaptureException = typeof RaycastAPI & {
  captureException?: (exception: unknown) => void;
};

export const reportRecoverableException = (exception: unknown) => {
  (RaycastAPI as RaycastApiWithCaptureException).captureException?.(exception);
};
