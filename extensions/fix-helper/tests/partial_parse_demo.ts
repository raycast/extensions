import { FIX_SPECS } from "../src/specs";

interface ParsedField {
    tag: number;
    name: string;
    value: string;
    description?: string;
}

function parseFixMessage(message: string, defaultVersion: string): { fields: ParsedField[]; version: string; delimiter: string } {
    // Detect delimiter
    const headerMatch = message.match(/^8=FIX\.\d\.\w+(.)/);
    let delimiter = "|";

    if (headerMatch) {
        delimiter = headerMatch[1];
    } else {
        if (message.includes("\x01")) delimiter = "\x01";
        else if (message.includes("|")) delimiter = "|";
        else if (message.includes("^")) delimiter = "^";
        else if (message.includes("~")) delimiter = "~";
        else if (message.includes(";")) delimiter = ";";
        else if (message.includes(" ")) delimiter = " ";
    }

    const rawFields = message
        .split(delimiter)
        .filter((field) => field.includes("="))
        .map((field) => {
            const [tagStr, ...valueParts] = field.split("=");
            const value = valueParts.join("=");
            const tag = parseInt(tagStr, 10);
            return { tag, value };
        })
        .filter((field) => !isNaN(field.tag));

    const beginStringField = rawFields.find((f) => f.tag === 8);
    const version = beginStringField ? beginStringField.value : defaultVersion;

    const spec = FIX_SPECS[version] || FIX_SPECS[defaultVersion] || FIX_SPECS["FIX.4.4"];

    const fields = rawFields.map((f) => {
        const name = spec.tags[f.tag] || "Unknown";
        const enumDesc = spec.enums[f.tag]?.[f.value];

        return {
            tag: f.tag,
            name,
            value: f.value,
            description: enumDesc,
        };
    });

    return { fields, version, delimiter };
}

const partialMessage = "35=D|55=AAPL|54=1|38=100|";
console.log(`Parsing partial message: "${partialMessage}"`);

const result = parseFixMessage(partialMessage, "FIX.4.4");

console.log(`Detected Delimiter: "${result.delimiter}"`);
console.log(`Inferred Version: ${result.version}`);
console.log("Fields:");
result.fields.forEach(f => {
    console.log(`  [${f.tag}] ${f.name}: ${f.value} ${f.description ? `(${f.description})` : ""}`);
});
