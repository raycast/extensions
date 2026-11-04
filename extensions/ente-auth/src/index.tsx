import { LaunchProps, showToast, Toast } from "@raycast/api";
import { useEffect, useRef, useState } from "react";
import { initialTOTPState, TOTPModel } from "./cloud/model";
import { AccountActions } from "./components/AccountActions";
import { CodeList } from "./components/CodeList";
import { mapSecretsToJsonFormat } from "./helpers";

export default function Command({ launchContext }: LaunchProps) {
	const [state, setState] = useState(initialTOTPState);
	const model = useRef<TOTPModel | null>(null);
	const signedInNoticeShown = useRef(false);

	useEffect(() => {
		const current = new TOTPModel(setState);
		model.current = current;
		void current.start();

		return () => {
			current.dispose();
			model.current = null;
		};
	}, []);

	useEffect(() => {
		if (launchContext?.signedIn !== true || signedInNoticeShown.current) {
			return;
		}

		signedInNoticeShown.current = true;
		void showToast({ style: Toast.Style.Success, title: "Signed in" }).catch(() => undefined);
	}, [launchContext?.signedIn]);

	const accountActions = (
		<AccountActions
			state={state}
			onRefresh={() => model.current?.refresh()}
			onSignOut={(mode) => model.current?.signOut(mode)}
			onRemoveImportedEntries={() => model.current?.removeImportedEntries()}
		/>
	);

	const items = mapSecretsToJsonFormat(state.entries);

	return <CodeList items={items} state={state} managementActions={accountActions} />;
}
