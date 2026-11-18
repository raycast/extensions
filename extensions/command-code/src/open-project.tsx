import {Icon, List} from '@raycast/api';
import {usePromise} from '@raycast/utils';
import type {ReactElement} from 'react';
import {loadProjects, openLink} from './lib/data';
import {ignoreLoadError, LoadError} from './lib/load-error';
import {MISSING_TAG, OpenActions} from './lib/open-actions';

export default function OpenProject(): ReactElement {
	const {data, isLoading, error} = usePromise(loadProjects, [], {
		onError: ignoreLoadError,
	});
	if (error) return <LoadError />;
	return (
		<List isLoading={isLoading} searchBarPlaceholder="Search projects">
			{data?.length === 0 && (
				<List.EmptyView
					title="No projects yet"
					description="Projects you add in Command Code appear here."
				/>
			)}
			{data?.map(project => (
				<List.Item
					key={project.path}
					title={project.name}
					subtitle={project.path}
					icon={Icon.Folder}
					accessories={project.folderMissing ? [MISSING_TAG] : []}
					actions={
						<OpenActions
							path={project.path}
							target={openLink(project.path)}
							folderMissing={project.folderMissing}
						/>
					}
				/>
			))}
		</List>
	);
}
