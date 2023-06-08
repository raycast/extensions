import { ActionPanel, Action, Icon, List, closeMainWindow, popToRoot } from "@raycast/api";
import { LaunchProps } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useEffect, useMemo } from "react";

import { scripts } from "./lib/apple-music";
import { Preferences } from "./lib/preferences";
import { divideNumber, handleResult, promisify } from "./lib/utils";

function getClosesNumber(n: number, numbers: number[]): number {
	return numbers.reduce((prev, curr) => (Math.abs(curr - n) < Math.abs(prev - n) ? curr : prev));
}

export default function SetVolume(props: LaunchProps) {
	const steps = divideNumber(100, Preferences.volume.step);

	const { data: volume, isLoading, mutate } = useCachedPromise(() => promisify(scripts.player.volume.get));
	const closestStep = useMemo(() => getClosesNumber(volume ?? 0, steps), [volume, isLoading, steps]);

	useEffect(() => {
		if (!props.arguments.volume) return;

		mutate(Promise.resolve(parseInt(props.arguments.volume)));
		handleResult(scripts.player.volume.set(parseInt(props.arguments.volume)), {
			successText: `Volume set to ${props.arguments.volume}`,
		})().then(() => {
			popToRoot();
			closeMainWindow();
		});
	}, [props.arguments.volume]);

	return (
		<List isLoading={isLoading} navigationTitle="Set Volume">
			{steps.map((step) => (
				<List.Item
					key={step}
					title={step.toString()}
					icon={Icon.SpeakerOn}
					actions={
						<ActionPanel>
							<Action
								title="Set Volume"
								icon={closestStep === step ? Icon.Check : Icon.SpeakerOn}
								onAction={handleResult(scripts.player.volume.set(step), {
									successText: `Volume set to ${step}`,
								})}
							/>
						</ActionPanel>
					}
				/>
			))}
		</List>
	);
}
