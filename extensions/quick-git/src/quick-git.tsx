import { useLocalStorage } from "@raycast/utils"
import { GitStatus } from "./components/GitStatus/GitStatus.js"

export default function Command() {
	const { value, isLoading } = useLocalStorage<string>("repo")

	return <GitStatus repo={value} isLoadingRepo={isLoading} />
}
