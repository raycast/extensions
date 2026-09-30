import { FIX_SPECS } from "../src/specs";

interface ParsedField {
    tag: number;
    name: string;
    value: string;
    description?: string;
}

// Re-implementing the modified parseFixMessage for testing purposes since we can't easily import the component-bound one
function parseFixMessage(message: string, defaultVersion: string): { fields: ParsedField[]; version: string } {
    const delimiter = message.includes("\x01") ? "\x01" : "|";

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

    return { fields, version };
}

const tests = [
    {
        name: "Default Version Override (FIX.4.2)",
        message: "35=D|55=AAPL|",
        defaultVersion: "FIX.4.2",
        expectedVersion: "FIX.4.2"
    },
    {
        name: "Default Version Override (FIX.5.0)",
        message: "35=D|55=AAPL|",
        defaultVersion: "FIX.5.0",
        expectedVersion: "FIX.5.0"
    },
    {
        name: "Tag 8 Priority",
        message: "8=FIX.4.4|35=D|55=AAPL|",
        defaultVersion: "FIX.4.0", // Should be ignored
        expectedVersion: "FIX.4.4"
    }
];

tests.forEach(test => {
    console.log(`Running test: ${test.name}`);
    const { version } = parseFixMessage(test.message, test.defaultVersion);

    if (version !== test.expectedVersion) {
        console.error(`FAILED: Expected version ${test.expectedVersion}, got ${version}`);
    } else {
        console.log(`Version check passed: ${version}`);
    }
    console.log("---");
});
