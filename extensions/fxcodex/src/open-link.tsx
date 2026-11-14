import { LaunchProps } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { OpenLinkForm } from "./components/open-link-form";
import { loadDashboard } from "./lib/dashboard";

export default function OpenLinkCommand(props: LaunchProps<{ arguments: Arguments.OpenLink }>) {
	const { data, isLoading } = usePromise(loadDashboard, []);

	return (
		<OpenLinkForm
			workspaces={data?.status.workspaces ?? []}
			workspaceIcons={data?.workspaceIcons}
			initialURL={props.arguments.url}
			executableSource={data?.source}
			isLoading={isLoading}
		/>
	);
}
