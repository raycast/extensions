import { RequireAccount } from './account-gate.tsx';
import { Workflows } from './workflows.tsx';

export default function Command() {
	return <RequireAccount>{({ key }) => <Workflows account={key} primary="runs" />}</RequireAccount>;
}
