import { Color, Icon, List } from "@raycast/api";
import { openApp, reveal } from "./fixes";
import { RccList } from "./rcc-list";
import { RowActions } from "./resolve";
import { parseFonts, sourceLabel, type FontsReport } from "./fonts-json";

function Rows({ f, actions }: { f: FontsReport; actions: React.ReactNode }) {
	// rcc fonts counts; it does not name the duplicate or the unreadable file,
	// so there is nothing here to delete by keystroke without guessing which
	// file was meant. Font Book is the tool that both names them and removes
	// them, so that is what Enter and Cmd+Enter open, and the row that does
	// know a path opens that path instead.
	const fontBook = {
		title: "Open Font Book",
		command: openApp("Font Book"),
		detail: "Font Book names the duplicates and the files macOS cannot read.",
		count: 1,
	};
	const row = <RowActions one={fontBook} all={fontBook} shared={actions} />;
	// The only line anyone acts on, so it is the only one that can be red.
	const broken = f.corrupted > 0;
	return (
		<>
			<List.Section title="Installed" subtitle={`${f.installed}`}>
				{f.sources.map((s) => (
					<List.Item
						key={s.path}
						icon={{
							source: Icon.Text,
							tintColor: Color.SecondaryText,
						}}
						title={sourceLabel(s.path)}
						subtitle={s.path}
						accessories={[{ text: String(s.count) }]}
						actions={
							<RowActions
								one={{
									title: "Show This Folder in Finder",
									command: reveal(s.path),
								}}
								all={fontBook}
								shared={actions}
							/>
						}
					/>
				))}
			</List.Section>
			<List.Section title="Health">
				<List.Item
					icon={{
						source: broken ? Icon.XMarkCircle : Icon.CheckCircle,
						tintColor: broken ? Color.Red : Color.Green,
					}}
					title="Corrupted fonts"
					subtitle={broken ? "fc-scan cannot read these" : undefined}
					accessories={[
						{
							tag: {
								value: String(f.corrupted),
								color: broken ? Color.Red : Color.Green,
							},
						},
					]}
					actions={row}
				/>
				<List.Item
					icon={{
						source: Icon.Duplicate,
						tintColor:
							f.fontconfig.duplicate_families > 0
								? Color.Orange
								: Color.SecondaryText,
					}}
					title="Duplicate families"
					accessories={[
						{
							tag: {
								value: String(f.fontconfig.duplicate_families),
								color:
									f.fontconfig.duplicate_families > 0
										? Color.Orange
										: Color.SecondaryText,
							},
						},
					]}
					actions={row}
				/>
			</List.Section>
			<List.Section title="Catalog">
				{f.fontconfig.available ? (
					<>
						<List.Item
							icon={{
								source: Icon.List,
								tintColor: Color.SecondaryText,
							}}
							title="Fonts known to fontconfig"
							accessories={[{ text: String(f.fontconfig.fonts) }]}
							actions={row}
						/>
						<List.Item
							icon={{
								source: Icon.List,
								tintColor: Color.SecondaryText,
							}}
							title="Families"
							accessories={[
								{ text: String(f.fontconfig.families) },
							]}
							actions={row}
						/>
					</>
				) : (
					<List.Item
						icon={{
							source: Icon.Minus,
							tintColor: Color.SecondaryText,
						}}
						title="fontconfig is not installed"
						subtitle="Duplicate and corruption checks need it"
						actions={row}
					/>
				)}
			</List.Section>
		</>
	);
}

export default function Command() {
	return (
		<RccList
			command="fonts"
			parse={parseFonts}
			navigationTitle={(f) =>
				f
					? `Fonts — ${f.installed} installed${f.corrupted > 0 ? `, ${f.corrupted} broken` : ""}`
					: "Fonts"
			}
			searchBarPlaceholder="Search font sources and checks"
			emptyIcon={Icon.Text}
			emptyTitle="No fonts found"
		>
			{(f, actions) => <Rows f={f} actions={actions} />}
		</RccList>
	);
}
