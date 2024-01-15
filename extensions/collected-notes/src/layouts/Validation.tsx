import { usePromise } from "@raycast/utils";
import { cn } from "../utils/collected-notes";
import { InvalidCredentials } from "./InvalidCredentials";
import { Toast, showToast } from "@raycast/api";

export function Validation({ children }: { children: React.ReactNode }) {
	const { isLoading, error, data } = usePromise(() => cn.me(), []);

	// @ts-expect-error For some reason error is in data
	const hasError = error || data?.error;

	if (hasError && !isLoading) {
		showToast(Toast.Style.Failure, "Error", "Failed to validate credentials");
		return <InvalidCredentials />;
	}

	return children;
}
