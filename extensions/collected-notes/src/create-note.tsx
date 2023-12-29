import { Action, ActionPanel, Color, Form, Icon, Toast, popToRoot, showToast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useState } from "react";
import { useSites } from "./hooks/use-sites";
import { NoteVisibility, cn } from "./utils/collected-notes";

export default function Command() {
	const [titleError, setTitleError] = useState<string | undefined>();

	function dropNameErrorIfNeeded() {
		if (titleError && titleError.length > 0) {
			setTitleError(undefined);
		}
	}

	const { currentSite, sites, sitesAreLoading } = useSites();

	return (
		<Form
			enableDrafts
			actions={
				<ActionPanel>
					<Action.SubmitForm
						onSubmit={async (values) => {
							try {
								await cn.create(
									{
										body: `# ${values.title}\n${values.content}`,
										visibility: values.visibility as NoteVisibility,
									},
									values.site_id,
								);
								showToast(Toast.Style.Success, `Note "${values.title}" created`);
								popToRoot();
							} catch (err) {
								showFailureToast("Failed to create note");
							}
						}}
					/>
				</ActionPanel>
			}
		>
			<Form.TextField
				id="title"
				title="Title"
				placeholder="Your post title"
				error={titleError}
				onChange={dropNameErrorIfNeeded}
				onBlur={(event) => {
					if (event.target.value?.length == 0) {
						setTitleError("The field should't be empty!");
					} else {
						dropNameErrorIfNeeded();
					}
				}}
			/>
			<Form.Dropdown id="visibility" title="Visibility" defaultValue="public" storeValue={true}>
				<Form.Dropdown.Item
					value="public_site"
					title="Public in Site"
					icon={{
						source: Icon.CircleFilled,
						tintColor: Color.Blue,
					}}
				/>
				<Form.Dropdown.Item
					value="public"
					title="Public"
					icon={{
						source: Icon.CircleFilled,
						tintColor: Color.Green,
					}}
				/>
				<Form.Dropdown.Item
					value="public_unlisted"
					title="Unlisted"
					icon={{
						source: Icon.CircleFilled,
						tintColor: Color.Yellow,
					}}
				/>
				<Form.Dropdown.Item
					value="private"
					title="Private"
					icon={{
						source: Icon.CircleFilled,
						tintColor: Color.Red,
					}}
				/>
			</Form.Dropdown>

			<Form.Dropdown
				id="site_id"
				title="Site"
				storeValue={true}
				isLoading={sitesAreLoading}
				defaultValue={currentSite}
			>
				{sites?.map((site) => <Form.Dropdown.Item key={site.id} value={String(site.id)} title={site.name} />)}
			</Form.Dropdown>

			<Form.TextArea id="content" title="Content" placeholder="Your post content" />
		</Form>
	);
}
