import { FIX_SPECS } from "../src/specs";

const version = "FIX.4.4";
const spec = FIX_SPECS[version];

const tags = Object.entries(spec.tags)
    .map(([tagStr, name]) => {
        const tag = parseInt(tagStr, 10);
        return {
            tag,
            name,
            enums: spec.enums[tag],
        };
    });

function search(query: string) {
    const lowerSearch = query.toLowerCase();
    return tags.filter(
        (t) => String(t.tag).includes(lowerSearch) || t.name.toLowerCase().includes(lowerSearch)
    );
}

console.log("Searching for '35'...");
const results35 = search("35");
console.log(results35.slice(0, 3)); // Show top 3

console.log("Searching for 'MsgType'...");
const resultsMsgType = search("MsgType");
console.log(resultsMsgType.slice(0, 3));

console.log("Searching for 'Side'...");
const resultsSide = search("Side");
console.log(resultsSide.slice(0, 3));
