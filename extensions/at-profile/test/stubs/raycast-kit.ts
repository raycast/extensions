// The kit's root import loads its toast module, which requires the real @raycast/api. Re-export the pure parts and
// stand in for the toasts.
export * from "@chrismessina/raycast-kit/plural";
export * from "@chrismessina/raycast-kit/errors";
export * from "@chrismessina/raycast-kit/bytes";
export const showError = async () => undefined;
export const failToast = () => true;
export const onErrorToast = () => () => undefined;
