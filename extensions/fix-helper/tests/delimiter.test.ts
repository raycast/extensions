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

const tests = [
    { name: "Pipe", message: "8=FIX.4.4|35=D|55=AAPL|", expectedDelimiter: "|" },
    { name: "SOH", message: "8=FIX.4.4\x0135=D\x0155=AAPL\x01", expectedDelimiter: "\x01" },
    { name: "Caret", message: "8=FIX.4.4^35=D^55=AAPL^", expectedDelimiter: "^" },
    { name: "Tilde", message: "8=FIX.4.4~35=D~55=AAPL~", expectedDelimiter: "~" },
    { name: "Semicolon", message: "8=FIX.4.4;35=D;55=AAPL;", expectedDelimiter: ";" },
    { name: "Space", message: "8=FIX.4.4 35=D 55=AAPL ", expectedDelimiter: " " },
    { name: "Fallback (No Header, Pipe)", message: "35=D|55=AAPL|", expectedDelimiter: "|" },
    { name: "Fallback (No Header, Tilde)", message: "35=D~55=AAPL~", expectedDelimiter: "~" },
];

let passed = 0;
tests.forEach(t => {
    const { delimiter, fields } = parseFixMessage(t.message, "FIX.4.4");
    if (delimiter === t.expectedDelimiter && fields.length >= 2) {
        console.log(`PASS: ${t.name}`);
        passed++;
    } else {
        console.error(`FAIL: ${t.name}. Expected '${t.expectedDelimiter}', got '${delimiter}'. Fields: ${fields.length}`);
    }
});

if (passed === tests.length) {
    console.log("All delimiter tests passed!");
} else {
    process.exit(1);
}
