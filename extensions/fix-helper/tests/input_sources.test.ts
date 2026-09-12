import { FIX_SPECS } from "../src/specs";

// Mock Raycast API functions
const mockGetSelectedText = async () => "8=FIX.4.2|35=D|55=AAPL|";
const mockClipboardReadText = async () => "8=FIX.4.4|35=D|55=GOOG|";

async function testInputSources() {
    console.log("Testing Selected Text Auto-fill...");
    try {
        const text = await mockGetSelectedText();
        if (text && (text.includes("=") || text.includes("\x01") || text.includes("|"))) {
            console.log(`Auto-fill successful: ${text}`);
        } else {
            console.error("Auto-fill failed");
        }
    } catch (e) {
        console.error(e);
    }

    console.log("---");

    console.log("Testing Clipboard Parse...");
    try {
        const text = await mockClipboardReadText();
        if (text) {
            console.log(`Clipboard read successful: ${text}`);
        } else {
            console.error("Clipboard read failed");
        }
    } catch (e) {
        console.error(e);
    }
}

testInputSources();
