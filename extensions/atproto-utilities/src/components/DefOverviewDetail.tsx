import { LexObject, LexUserType, LexXrpcParameters } from "@atproto/lexicon";
import { List } from "@raycast/api";

const linkToRef = (ref: string, lexName: string) =>
	`[${ref}](raycast://extensions/futur/atproto-utilities/lexicon-search?arguments=${encodeURIComponent(
		JSON.stringify({
			query: ref.startsWith("#") ? `${lexName}${ref}` : ref,
		}),
	)})`;

function stringifyPossibleRef(possibleRef: LexObject["properties"][string], lexName: string): string {
	return possibleRef.type === "ref"
		? linkToRef(possibleRef.ref, lexName)
		: possibleRef.type === "union" && possibleRef.refs.length === 1
			? linkToRef(possibleRef.refs[0], lexName)
			: possibleRef.type === "array"
				? `Array<${stringifyPossibleRef(possibleRef.items, lexName)}>`
				: possibleRef.type;
}

function stringifyComplexType(
	type: LexObject | LexXrpcParameters | LexObject["properties"][string],
	lexName: string,
	indentAmount = 2,
): string | null {
	const indent = " ".repeat(indentAmount); // nbsp
	if (type.type === "union")
		return type.refs.length <= 1
			? null
			: type.refs.map((ref) => indent + "- " + linkToRef(ref, lexName)).join(" or\n");
	if (type.type === "object" || type.type === "params") {
		let result = "";
		if (type.type === "object") result += indent + "Object:\n";
		for (const [name, prop] of Object.entries(type.properties)) {
			result += "\n";
			result += stringifyPropertyType(
				name,
				prop,
				!type.required?.includes(name) || ("nullable" in type && type.nullable?.includes(name)) || false,
				lexName,
				indentAmount,
			);
		}
		return result;
	}
	if (type.type === "array") {
		return type.items.type === "union"
			? indent + "- Array of:\n" + stringifyComplexType(type.items, lexName, indentAmount + 2)
			: null;
	}
	return null;
}

function stringifyAttributes(type: LexObject | LexObject["properties"][string]): string {
	const {
		type: _type,
		description: _description,
		ref: _ref,
		items: _items,
		properties: _properties,
		refs: _refs,
		...attributes
	} = {
		description: "",
		ref: "",
		items: {},
		properties: {},
		refs: [],
		...type,
	};

	const entries = Object.entries(attributes);
	if (!entries.length) return "";
	return entries
		.map(
			([key, value]) =>
				`\t>\t- ${key}: ${
					Array.isArray(value) ? value.map((v) => JSON.stringify(v)).join(", ") : JSON.stringify(value)
				}`,
		)
		.join("\n");
}

function stringifyPropertyType(
	name: string,
	property: LexObject["properties"][string],
	optional: boolean,
	lexName: string,
	indentAmount = 0,
): string {
	const indent = " ".repeat(indentAmount); // nbsp
	let markdown = indent + `- **${name}**`;
	if (optional) markdown += "?";
	const type = stringifyComplexType(property, lexName, indentAmount + 2);
	if (type) {
		if (property.description) markdown += ` — ${property.description}`;
		markdown += `\n${type}`;
	} else {
		markdown += ` (${stringifyPossibleRef(property, lexName)})`;
		if (property.description) markdown += ` — ${property.description}`;
	}
	const attributes = stringifyAttributes(property);
	if (attributes) markdown += `\n\n${indent}${attributes}`;
	return markdown;
}

export function DefOverviewDetail({ def, lexiconName }: { def: LexUserType; lexiconName: string }) {
	let markdown = "";

	if (def.type === "query") markdown = `**Query**\n\n${def.description}`;
	else if (def.type === "procedure") markdown = `**Procedure**\n\n${def.description}`;
	else if (def.type === "subscription") markdown = `**Subscription**\n\n${def.description}`;
	else if (def.type === "object" && def.description) markdown = `**Object**\n\n${def.description}`;
	else if (def.type === "record" && def.description) markdown = `**Record**\n\n${def.description}`;
	else if (def.type === "array") {
		markdown = `**Array**\n\n`;
		if (def.description) markdown += `${def.description}\n`;
		const complexTyoe = stringifyComplexType(def.items, lexiconName);
		if (complexTyoe) markdown += `Contains:\n${complexTyoe}`;
		else markdown += `Contains: ${stringifyPossibleRef(def.items, lexiconName)}`;
	}

	const {
		properties,
		required: requiredProperties,
		nullable: nullableProperties,
	} = "properties" in def && def.properties
		? def
		: "record" in def && def.record.properties
			? def.record
			: {
					properties: undefined,
					required: undefined,
					nullable: undefined,
				};

	if (properties) {
		markdown += "\n\n## Properties";
		for (const [name, property] of Object.entries(properties)) {
			const required = requiredProperties?.includes(name);
			const nullable = nullableProperties?.includes(name);
			markdown += "\n";
			markdown += stringifyPropertyType(name, property, !required || nullable || false, lexiconName);
		}
	}
	if ("input" in def && def.input) {
		markdown += "\n\n## Input";
		if (def.input.description) markdown += `\n${def.input.description}`;

		if (def.input.schema?.type === "ref") {
			markdown += `\nSchema: ${linkToRef(def.input.schema.ref, lexiconName)}`;
		} else if (def.input.schema?.type === "object" || def.input.schema?.type === "union") {
			markdown += "\n" + stringifyComplexType(def.input.schema, lexiconName);
		}
	}
	if ("parameters" in def && def.parameters && Object.values(def.parameters.properties).length) {
		markdown += "\n\n## Parameters";
		if (def.parameters.description) markdown += `\n${def.parameters.description}`;
		markdown += "\n";
		markdown += stringifyComplexType(def.parameters, lexiconName);
	}
	if ("output" in def && def.output) {
		markdown += "\n\n## Output";
		if (def.output.description) markdown += `\n${def.output.description}`;
		if (def.output.schema?.type === "ref") {
			markdown += `\nSchema: ${linkToRef(def.output.schema.ref, lexiconName)}`;
		} else if (def.output.schema?.type === "object" || def.output.schema?.type === "union") {
			markdown += "\n" + stringifyComplexType(def.output.schema, lexiconName);
		}
	}
	if ("errors" in def && def.errors) {
		markdown += "\n\n## Errors";
		for (const { name, description } of def.errors) {
			markdown += `\n- **${name}**`;
			if (description) markdown += ` — ${description}`;
		}
	}

	return <List.Item.Detail markdown={markdown} />;
}
