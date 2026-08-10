import { Toast, showToast } from "@raycast/api";

const useErrorToast = (error: string | null) => {
  if (error) {
    showToast({
      style: Toast.Style.Failure,
      title: "Something went wrong",
      message: error,
    });
  }
};

export default useErrorToast;
