import { getPreferenceValues, List } from "@raycast/api";
import { type Element, elements } from "./elements-list";
import { getElementIcon } from "./icon";

function getElementMarkdown(element: Element): string {
	const lines: string[] = [];

	lines.push(element.summary);

	return lines.join("\n\n");
}

export default function Command() {
	return (
		<List isShowingDetail>
			{elements.map((element) => (
				<List.Item
					key={element.name}
					title={element.name}
					keywords={[element.name, element.symbol, element.atomic_mass.toString()]}
					subtitle={`${element.number} - Atomic Mass: ${element.atomic_mass}`}
					icon={getElementIcon(element)}
					detail={
						<List.Item.Detail
							markdown={getElementMarkdown(element)}
							metadata={
								<List.Item.Detail.Metadata>
									<List.Item.Detail.Metadata.Label title="Name" text={element.name} />
									<List.Item.Detail.Metadata.Label
										title="Discovered By"
										text={element.discovered_by ?? "Unknown"}
									/>
									<List.Item.Detail.Metadata.Separator />

									<List.Item.Detail.Metadata.Label title="Symbol" text={element.symbol} />
									<List.Item.Detail.Metadata.Label
										title="Atomic Number"
										text={element.number.toString()}
									/>
									<List.Item.Detail.Metadata.Label
										title="Atomic Mass"
										text={element.atomic_mass.toString()}
									/>
									<List.Item.Detail.Metadata.Label title="Category" text={element.category} />
								</List.Item.Detail.Metadata>
							}
						/>
					}
				/>
			))}
		</List>
	);
}
