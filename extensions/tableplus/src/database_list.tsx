import {ActionPanel, List, OpenInBrowserAction} from "@raycast/api";
import plist from "plist";
import fs from "fs";
import os from "os";
import {useEffect, useState} from "react";

export default function DatabaseList() {
	const [state, setState] = useState<Item[]>([]);
	const [query, setQuery] = useState<string | undefined>(undefined);
	const [loading, setLoading] = useState(false)
	const tablePlusLocation = `${os.homedir()}/Library/Application Support/com.tinyapp.TablePlus/Data/Connections.plist`;

	useEffect(() => {
		try {
			setLoading(true)
			const connections = plist.parse(fs.readFileSync(tablePlusLocation, "utf8")) as ReadonlyArray<plist.PlistObject>;

			const obj = connections.map((connection) => {
				return {id: connection.ID, groupName: connection.GroupID, name: connection.ConnectionName} as Item;
			})
			setLoading(false)

			setState(obj);
		} catch (error) {
			console.log(error)
		}
	}, []);

	return (
		<List
			isLoading={loading}
			searchBarPlaceholder="Filter by name..."
			onSearchTextChange={(query) => setQuery(query)}
		>
			{state
				.filter(
					(process) =>
						(query == null || process.name.toLowerCase().includes(query.toLowerCase()))
				)
				.map((process, index) => {
					return (
						<List.Item
							key={index}
							title={process.name}
							subtitle={process.groupName}
							icon='/Applications/TablePlus.app/Contents/Resources/AppIcon.icns'
							actions={
								<ActionPanel>
									<OpenInBrowserAction title="Open Database" url={`tableplus://?id=${process.id}`}/>
								</ActionPanel>

							}
						/>
					);
				})}
		</List>
	);
}

type Item = {
	id: string;
	groupName: string;
	name: string;
};
