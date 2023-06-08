import { Preferences } from "@/lib/preferences";
import { Icon, List } from "@raycast/api";
import { useCachedState } from "@raycast/utils";

interface Props {
	onViewChange: (view: string) => void;
	value?: string;
}

const ViewPicker = ({ onViewChange, value }: Props) => (
	<List.Dropdown tooltip="View Type" defaultValue={value} storeValue onChange={onViewChange}>
		<List.Dropdown.Item icon={Icon.List} title="List" value="list" />
		<List.Dropdown.Item icon={Icon.AppWindowGrid2x2} title="Grid" value="grid" />
	</List.Dropdown>
);

export default ViewPicker;

export const useViewPreference = () => {
	const [view, setView] = useCachedState<string>("list");

	return [view, setView] as const;
};
