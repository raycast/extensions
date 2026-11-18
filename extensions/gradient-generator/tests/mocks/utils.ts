import { showToast, Toast } from './raycast';
export const showFailureToast = (error: Error, options: { title: string }) =>
  showToast({ ...options, style: Toast.Style.Failure, message: error.message });
