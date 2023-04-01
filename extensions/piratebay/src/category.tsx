import { Icon, Color, Detail, List, showToast, Toast, Action, ActionPanel, preferences } from "@raycast/api";
import cheerio from "cheerio";
import { useEffect, useState } from "react";
import { useFetch } from "@raycast/utils";
import { search, checkIsUp, proxies } from './piratebay-search.js';
import { categories } from './categories.js'

export default function Command() {
	const [query, setQuery] = useState<null | string>(null);
	const [state, setState] = useState<Result[]>([]);
	const [entries, setEntries] = useState([]);
	const [loading, setLoading] = useState(true);
	const [category, setCategory] = useState<string>("All");
	
	useEffect(() => {
		async function fetch() {
			if (!query) {
				setQuery("*");
				setState([]);
				return;
			}
			try {
				setLoading(true);
				await search(encodeURI(query), {
					baseURL: preferences.instance.value, // default https://thepiratebay.org
					page: 0, // default 0
					category: category,
					sortby: preferences.sortby.value // default 'seeders'. Options are 'default', 'uploaded', 'size', 'uploadedBy', 'seeders' and 'leechers'
				}).then((res) => 
					setEntries(res)
				).catch(console.error)
			} catch (e) {
				await showToast({
				style: Toast.Style.Failure,
				title: "Failed to fetch entries",
				message: "Please try again later",
				});
			} finally {
				setLoading(false)
			}
		}
		fetch();
	}, [query, category]);
	
	if (!entries) return;

	return (
	<List
		navigationTitle={`PirateBay Search`}
		filtering={false}
		onSearchTextChange={(text) => {setQuery(text)}}
		throttle
		searchBarPlaceholder="Search entry..."
		searchBarAccessory={
		<List.Dropdown
			tooltip="Select Category"
			storeValue={true}
			onChange={(newValue) => {
				setCategory(newValue)
			}}
		>
			{categories.map((loc) => (
					<List.Dropdown.Item key={loc.value} title={loc.title} value={loc.value} keywords={[loc.title, loc.value]} />
			))}
		</List.Dropdown>
	}
	>

	{entries.map((entry) => {
		if (entry.vip && entry.comments) {
			return <List.Item
				key={entry.link}
				title={entry.name}
				accessories={[
					{ tag: { value: "VIP", color: Color.Green } },
					{ tag: { value: entry.commentsCount, color: Color.Yellow } },
					{ icon: Icon.Upload, text: entry.seeds, tooltip: "seeds" },
					{ icon: Icon.Download, text: entry.peers, tooltip: "peers" },
 					{ icon: Icon.MemoryStick, text: entry.description.split(/.*Size /g).join('').split(/\.\d*/g).join('').split(/,.*/g).join('').split('i').join(''), tooltip: "size" },
 					{ tag: new Date(entry.description.split('Uploaded ').join('').split(/,.*/g).join('').split(' ').join('-').split(/\d\d:\d\d/g).join(new Date().getFullYear())) },
				]}
				actions={
					EntryActions(entry.name, entry.file, entry.link, 'VIP')
				}
			/>;
		} else if (entry.vip && !entry.comments) {
			return <List.Item
				key={entry.link}
				title={entry.name}
				accessories={[
					{ tag: { value: "VIP", color: Color.Green } },
					{ icon: Icon.Upload, text: entry.seeds, tooltip: "seeds" },
					{ icon: Icon.Download, text: entry.peers, tooltip: "peers" },
// 						{ icon: Icon.Person, text: entry.description.split(/.*ULed by	/g).join(''), tooltip: "uploaded by" },
// 					{ text: `An Accessory Text`, icon: Icon.Hammer },
// 					{ text: { value: `A Colored Accessory Text`, color: Color.Orange }, icon: Icon.Hammer },
 					{ icon: Icon.MemoryStick, text: entry.description.split(/.*Size /g).join('').split(/\.\d*/g).join('').split(/,.*/g).join('').split('i').join(''), tooltip: "size" },
// 					{ text: "Just Do It!" },
// 					{ date: new Date(entry.date_publish) },
 					{ tag: new Date(entry.description.split('Uploaded ').join('').split(/,.*/g).join('').split(' ').join('-').split(/\d\d:\d\d/g).join(new Date().getFullYear())) },
				]}
				actions={
					EntryActions(entry.name, entry.file, entry.link, 'VIP')
				}
			/>;
		} else if (entry.trusted && entry.comments) {
			return <List.Item
				key={entry.link}
				title={entry.name}
				accessories={[
					{ tag: { value: "Trusted", color: Color.Magenta } },
					{ tag: { value: entry.commentsCount, color: Color.Yellow } },
					{ icon: Icon.Upload, text: entry.seeds, tooltip: "seeds" },
					{ icon: Icon.Download, text: entry.peers, tooltip: "peers" },
 					{ icon: Icon.MemoryStick, text: entry.description.split(/.*Size /g).join('').split(/\.\d*/g).join('').split(/,.*/g).join('').split('i').join(''), tooltip: "size" },
 					{ tag: new Date(entry.description.split('Uploaded ').join('').split(/,.*/g).join('').split(' ').join('-').split(/\d\d:\d\d/g).join(new Date().getFullYear())) },
				]}
				actions={
					EntryActions(entry.name, entry.file, entry.link, 'Trusted')
				}
			/>;
		} else if (entry.trusted && !entry.comments) {
			return <List.Item
				key={entry.link}
				title={entry.name}
				accessories={[
					{ tag: { value: "Trusted", color: Color.Magenta } },
					{ icon: Icon.Upload, text: entry.seeds, tooltip: "seeds" },
					{ icon: Icon.Download, text: entry.peers, tooltip: "peers" },
 					{ icon: Icon.MemoryStick, text: entry.description.split(/.*Size /g).join('').split(/\.\d*/g).join('').split(/,.*/g).join('').split('i').join(''), tooltip: "size" },
 					{ tag: new Date(entry.description.split('Uploaded ').join('').split(/,.*/g).join('').split(' ').join('-').split(/\d\d:\d\d/g).join(new Date().getFullYear())) },
				]}
				actions={
					EntryActions(entry.name, entry.file, entry.link, 'Trusted')
				}
			/>;
		} else if (entry.name && entry.comments) {
			return <List.Item
				key={entry.link}
				title={entry.name}
				accessories={[
					{ tag: { value: entry.commentsCount, color: Color.Yellow } },
					{ icon: Icon.Upload, text: entry.seeds, tooltip: "seeds" },
					{ icon: Icon.Download, text: entry.peers, tooltip: "peers" },
 					{ icon: Icon.MemoryStick, text: entry.description.split(/.*Size /g).join('').split(/\.\d*/g).join('').split(/,.*/g).join('').split('i').join(''), tooltip: "size" },
 					{ tag: new Date(entry.description.split('Uploaded ').join('').split(/,.*/g).join('').split(' ').join('-').split(/\d\d:\d\d/g).join(new Date().getFullYear())) },
				]}
				actions={
					EntryActions(entry.name, entry.file, entry.link, '')
				}
			/>;
		} else if (entry.name && !entry.comments) {
			return <List.Item
				key={entry.link}
				title={entry.name}
				accessories={[
					{ icon: Icon.Upload, text: entry.seeds, tooltip: "seeds" },
					{ icon: Icon.Download, text: entry.peers, tooltip: "peers" },
 					{ icon: Icon.MemoryStick, text: entry.description.split(/.*Size /g).join('').split(/\.\d*/g).join('').split(/,.*/g).join('').split('i').join(''), tooltip: "size" },
 					{ tag: new Date(entry.description.split('Uploaded ').join('').split(/,.*/g).join('').split(' ').join('-').split(/\d\d:\d\d/g).join(new Date().getFullYear())) },
				]}
				actions={
					EntryActions(entry.name, entry.file, entry.link, '')
				}
			/>;
		}
	})}
	</List>
	);
}

function EntryActions(name: string, file: string, link: string, tag: string) {
	return (
		<ActionPanel>
			<Action.Push
				icon={Icon.Book}
				title="Read Details"
				target={<Details name={name} file={file} link={link} tag={tag} />}
			/>
			<Action.Open icon={Icon.Logout} title="Open Magnet Link" target={file} />
			<Action.Open icon={Icon.Globe} title="Open Entry in Browser" target={link} shortcut={{ modifiers: ["opt"], key: "enter" }} />
		</ActionPanel>
	);
}

const Details = (props: {name: string; file: string, link: string, tag: string}) => {

	const [searchText, setSearchText] = useState("");
	const { isLoading, data } = useFetch(props.link, {
		// to make sure the screen isn't flickering when the searchText changes
		keepPreviousData: true,
		initialData: "",
	});

  const $ = cheerio.load(String(data));
	
	// ÜBERSCHRIFT
	let markdown = "# " + props.name + "\n";

	// Parse NFO
	let nfo = "";
	$(".nfo").find("pre").each(function(i, link) {
		nfo += $(link).text();
	});
	
	// NFO
	//sobald Daten da sind, werden sie in markdown überführt
	if (nfo) {
		markdown += nfo.split('~').join('').split('`').join('').replace(/(\b(https?|ftp|file):\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/ig, "[$1]($1)");
		//markdown += nfo.split('~').join('').split('`').join('').replace(/(\b(https?|ftp|file):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/ig, "[$1]($1)");
		// image urls:.replace(/https?:\/\/.*\.(?:png|jpg|gif)/ig,'[![]($&)]($&)')
	}
	
	let latestComment = "";
	if ($("#comments").find(".comment").last().text().replace(/\n/, '')) {
		latestComment = $("#comments").find(".comment").last().text().replace(/^\s+|\s+$/g, '');
	} else {
		latestComment = '<no comments>'
	}
	
		const titles = [];
	$("#details").find("dt").each(function(i, link) {
		titles.push(($(link).text()));
// 		nfo += $(link).text();
	});
	const values = [];
	$("#details").find("dd").each(function(i, link) {
		values.push(($(link).text().replace(/\n/g, '').replace(/\t/g, '')));
// 		nfo += $(link).text();
	});
	
	const details = [];
	for (let index = 0; index < titles.length; ++index) {
		const detailEntry = {
			title: titles[index].replace(':', ''),
			value: values[index]
		}
		details.push(detailEntry)
	}
	if (details != '') { // WAIT TILL WE HAVE THE DETAILS
	if (props.tag === "VIP") {
		return (
		<Detail
			navigationTitle={`PirateBay Search - ${props.name}`}
			isLoading={isLoading}
			markdown={markdown}
				metadata={
					<Detail.Metadata>
						<Detail.Metadata.Label title="Type" text={details.find(detail => detail.title == 'Type').value} />
						<Detail.Metadata.Label title="Files" text={details.find(detail => detail.title == 'Files').value} />
						<Detail.Metadata.Label title="Size" text={details.find(detail => detail.title == 'Size').value} />
						<Detail.Metadata.Label title="Info Hash" text={$(".col2").last().html().replace(/.*dd>$/mg, '').replace(/.*dt>$/mg, '').replace(/.*a>$/mg, '').replace(/.*span>$/mg, '').replace(/.*br>$/mg, '').replace(/\s/g, '').replace(/.*i>/mg, '')} />
						<Detail.Metadata.Label title="Uploaded" text={new Date(details.find(detail => detail.title == 'Uploaded').value).toLocaleDateString("de-DE", { day: '2-digit', month: '2-digit', year: 'numeric' })} />
						<Detail.Metadata.Label title="By" text={details.find(detail => detail.title == 'By').value} />
						<Detail.Metadata.TagList title="Tag">
							<Detail.Metadata.TagList.Item text={props.tag} color={Color.Green} />
						</Detail.Metadata.TagList>
						<Detail.Metadata.Label title="Seeders" text={details.find(detail => detail.title == 'Seeders').value} />
						<Detail.Metadata.Label title="Leechers" text={details.find(detail => detail.title == 'Leechers').value} />
						<Detail.Metadata.Separator />
						<Detail.Metadata.TagList title="Comments">
							<Detail.Metadata.TagList.Item text={details.find(detail => detail.title == 'Comments').value.replace(/\t/g, '').replace(' ', '')}color={Color.Yellow} />
						</Detail.Metadata.TagList>
						<Detail.Metadata.Label title="Latest Comment" text={latestComment} />
					</Detail.Metadata>
				}
			actions={
			<ActionPanel>
				<Action.Open icon={Icon.Logout} title="Open Magnet Link" target={props.file} />
				<Action.Open icon={Icon.Globe} title="Open Entry in Browser" target={props.link} shortcut={{ modifiers: ["opt"], key: "enter" }} />
			</ActionPanel>
			}
		/>
		);
	} else if (props.tag === "Trusted") {
		return (
		<Detail
			navigationTitle={`PirateBay Search - ${props.name}`}
			isLoading={isLoading}
			markdown={markdown}
				metadata={
					<Detail.Metadata>
						<Detail.Metadata.Label title="Type" text={details.find(detail => detail.title == 'Type').value} />
						<Detail.Metadata.Label title="Files" text={details.find(detail => detail.title == 'Files').value} />
						<Detail.Metadata.Label title="Size" text={details.find(detail => detail.title == 'Size').value} />
						<Detail.Metadata.Label title="Info Hash" text={$(".col2").last().html().replace(/.*dd>$/mg, '').replace(/.*dt>$/mg, '').replace(/.*a>$/mg, '').replace(/.*span>$/mg, '').replace(/.*br>$/mg, '').replace(/\s/g, '').replace(/.*i>/mg, '')} />
						<Detail.Metadata.Label title="Uploaded" text={new Date(details.find(detail => detail.title == 'Uploaded').value).toLocaleDateString("de-DE", { day: '2-digit', month: '2-digit', year: 'numeric' })} />
						<Detail.Metadata.Label title="By" text={details.find(detail => detail.title == 'By').value} />
						<Detail.Metadata.TagList title="Tag">
							<Detail.Metadata.TagList.Item text={props.tag} color={Color.Magenta} />
						</Detail.Metadata.TagList>
						<Detail.Metadata.Label title="Seeders" text={details.find(detail => detail.title == 'Seeders').value} />
						<Detail.Metadata.Label title="Leechers" text={details.find(detail => detail.title == 'Leechers').value} />
						<Detail.Metadata.Separator />
						<Detail.Metadata.TagList title="Comments">
							<Detail.Metadata.TagList.Item text={details.find(detail => detail.title == 'Comments').value.replace(/\t/g, '').replace(' ', '')}color={Color.Yellow} />
						</Detail.Metadata.TagList>
						<Detail.Metadata.Label title="Latest Comment" text={latestComment} />
					</Detail.Metadata>
				}
			actions={
			<ActionPanel>
				<Action.Open icon={Icon.Logout} title="Open Magnet Link" target={props.file} />
				<Action.Open icon={Icon.Globe} title="Open Entry in Browser" target={props.link} shortcut={{ modifiers: ["opt"], key: "enter" }} />
			</ActionPanel>
			}
		/>
		);
	} else {
		return (
		<Detail
			navigationTitle={`PirateBay Search - ${props.name}`}
			isLoading={isLoading}
			markdown={markdown}
				metadata={
					<Detail.Metadata>
						<Detail.Metadata.Label title="Type" text={details.find(detail => detail.title == 'Type').value} />
						<Detail.Metadata.Label title="Files" text={details.find(detail => detail.title == 'Files').value} />
						<Detail.Metadata.Label title="Size" text={details.find(detail => detail.title == 'Size').value} />
						<Detail.Metadata.Label title="Info Hash" text={$(".col2").last().html().replace(/.*dd>$/mg, '').replace(/.*dt>$/mg, '').replace(/.*a>$/mg, '').replace(/.*span>$/mg, '').replace(/.*br>$/mg, '').replace(/\s/g, '').replace(/.*i>/mg, '')} />
						<Detail.Metadata.Label title="Uploaded" text={new Date(details.find(detail => detail.title == 'Uploaded').value).toLocaleDateString("de-DE", { day: '2-digit', month: '2-digit', year: 'numeric' })} />
						<Detail.Metadata.Label title="By" text={details.find(detail => detail.title == 'By').value} />
						<Detail.Metadata.Label title="Seeders" text={details.find(detail => detail.title == 'Seeders').value} />
						<Detail.Metadata.Label title="Leechers" text={details.find(detail => detail.title == 'Leechers').value} />
						<Detail.Metadata.Separator />
						<Detail.Metadata.TagList title="Comments">
							<Detail.Metadata.TagList.Item text={details.find(detail => detail.title == 'Comments').value.replace(/\t/g, '').replace(' ', '')}color={Color.Yellow} />
						</Detail.Metadata.TagList>
						<Detail.Metadata.Label title="Latest Comment" text={latestComment} />
					</Detail.Metadata>
				}
			actions={
			<ActionPanel>
				<Action.Open icon={Icon.Logout} title="Open Magnet Link" target={props.file} />
				<Action.Open icon={Icon.Globe} title="Open Entry in Browser" target={props.link} shortcut={{ modifiers: ["opt"], key: "enter" }} />
			</ActionPanel>
			}
		/>
		);
	}
}	
};