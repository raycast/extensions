const config = require("@raycast/eslint-config");
console.log("Is array:", Array.isArray(config));
console.log("Length:", config.length);
config.forEach((item, index) => {
    console.log(`Item ${index}:`, Array.isArray(item) ? "Array" : typeof item);
    if (Array.isArray(item)) {
        console.log(`  Nested Array Length: ${item.length}`);
    }
});
