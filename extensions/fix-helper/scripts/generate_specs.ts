import https from "https";
import fs from "fs";
import path from "path";

const VERSIONS = ["FIX40", "FIX41", "FIX42", "FIX43", "FIX44", "FIX50", "FIX50SP1", "FIX50SP2"];
const BASE_URL = "https://raw.githubusercontent.com/Trumid/node-quickfix/master/quickfix/spec/";
const OUTPUT_FILE = path.join(__dirname, "../src/specs.ts");

interface FixSpec {
    tags: Record<number, { name: string; type?: string }>;
    enums: Record<number, Record<string, string>>;
}

const specs: Record<string, FixSpec> = {};

function fetchSpec(version: string): Promise<string> {
    return new Promise((resolve, reject) => {
        const url = `${BASE_URL}${version}.xml`;
        console.log(`Fetching ${url}...`);
        https.get(url, (res) => {
            if (res.statusCode !== 200) {
                reject(new Error(`Failed to fetch ${url}: ${res.statusCode}`));
                return;
            }
            let data = "";
            res.on("data", (chunk) => (data += chunk));
            res.on("end", () => resolve(data));
        }).on("error", reject);
    });
}

const MSG_TYPE_OVERRIDES: Record<string, string> = {
    // Standardize MsgType descriptions across versions.
    // Some source XMLs use internal names like "ORDER_D" (FIX 4.0) vs "ORDER_SINGLE" (FIX 4.4).
    // These overrides ensure consistent, human-readable names like "New Order - Single".
    "0": "Heartbeat",
    "1": "Test Request",
    "2": "Resend Request",
    "3": "Reject",
    "4": "Sequence Reset",
    "5": "Logout",
    "6": "Indication of Interest",
    "7": "Advertisement",
    "8": "Execution Report",
    "9": "Order Cancel Reject",
    "A": "Logon",
    "B": "News",
    "C": "Email",
    "D": "New Order - Single",
    "E": "New Order - List",
    "F": "Order Cancel Request",
    "G": "Order Cancel/Replace Request",
    "H": "Order Status Request",
    "J": "Allocation Instruction",
    "K": "List Cancel Request",
    "L": "List Execute",
    "M": "List Status Request",
    "N": "List Status",
    "P": "Allocation Instruction Ack",
    "Q": "Don't Know Trade (DK)",
    "R": "Quote Request",
    "S": "Quote",
    "T": "Settlement Instructions",
    "V": "Market Data Request",
    "W": "Market Data Snapshot/Full Refresh",
    "X": "Market Data Incremental Refresh",
    "Y": "Market Data Request Reject",
    "Z": "Quote Cancel",
    "a": "Quote Status Request",
    "b": "Mass Quote Acknowledgement",
    "c": "Security Definition Request",
    "d": "Security Definition",
    "e": "Security Status Request",
    "f": "Security Status",
    "g": "Trading Session Status Request",
    "h": "Trading Session Status",
    "i": "Mass Quote",
    "j": "Business Message Reject",
    "k": "Bid Request",
    "l": "Bid Response",
    "m": "List Strike Price",
};

function parseXml(xml: string): FixSpec {
    const tags: Record<number, { name: string; type?: string }> = {};
    const enums: Record<number, Record<string, string>> = {};

    // Match <field ... > ... </field> or <field ... />
    // We capture the attributes string and the content (if any)
    const tagRegex = /<field\s+([^>]+?)(?:\/>|>(.*?)<\/field>)/gs;

    let match;
    while ((match = tagRegex.exec(xml)) !== null) {
        const attributes = match[1];
        const content = match[2]; // undefined if self-closing

        // Extract number and name from attributes
        const numberMatch = attributes.match(/number='(\d+)'/);
        const nameMatch = attributes.match(/name='([^']+)'/);
        const typeMatch = attributes.match(/type='([^']+)'/);

        if (numberMatch && nameMatch) {
            const tag = parseInt(numberMatch[1], 10);
            const name = nameMatch[1];

            tags[tag] = { name };
            if (typeMatch) {
                tags[tag].type = typeMatch[1];
            }

            if (content) {
                // Parse enums from content: <value enum='D' description='NEW_ORDER_SINGLE' />
                const valueRegex = /<value\s+enum='([^']+)'\s+description='([^']+)'/g;
                let valMatch;
                while ((valMatch = valueRegex.exec(content)) !== null) {
                    if (!enums[tag]) enums[tag] = {};
                    const val = valMatch[1];
                    let desc = valMatch[2].replace(/_/g, " ");

                    // Apply overrides for MsgType (Tag 35)
                    if (tag === 35 && MSG_TYPE_OVERRIDES[val]) {
                        desc = MSG_TYPE_OVERRIDES[val];
                    }

                    // Append <Value> to description - REVERTED per user request
                    enums[tag][val] = desc;
                }
                if (tag === 35) {
                    console.log(`Found Tag 35 Enums: ${Object.keys(enums[tag] || {}).length}`);
                }
            }
        }
    }
    return { tags, enums };
}

async function main() {
    try {
        for (const version of VERSIONS) {
            const xml = await fetchSpec(version);
            const spec = parseXml(xml);

            let key = version.replace("FIX", "FIX."); // FIX.40
            if (version.startsWith("FIX4") || version === "FIX50") {
                key = `FIX.${version[3]}.${version[4]}`;
            } else if (version.startsWith("FIX50SP")) {
                key = `FIX.5.0${version.substring(5)}`; // FIX.5.0SP1
            }

            specs[key] = spec;
            console.log(`Parsed ${version}: ${Object.keys(spec.tags).length} tags, ${Object.keys(spec.enums).length} fields with enums`);
        }

        const content = `// Auto-generated by scripts/generate_specs.ts
export const FIX_SPECS: Record<string, {
  tags: Record<number, { name: string; type?: string }>;
  enums: Record<number, Record<string, string>>;
}> = ${JSON.stringify(specs, null, 2)};
`;

        fs.writeFileSync(OUTPUT_FILE, content);
        console.log(`Generated ${OUTPUT_FILE}`);
    } catch (error) {
        console.error("Error:", error);
        process.exit(1);
    }
}

main();
