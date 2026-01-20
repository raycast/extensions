// Mock Raycast API
const mockGetSelectedText = async () => ""; // Empty selection
const mockClipboardReadText = async () => "8=FIX.4.4|35=D|55=MSFT|"; // Valid clipboard

async function testAutoParse() {
    console.log("Testing Auto-parse Logic...");

    // 1. Check Selection
    let selectedText = "";
    try {
        selectedText = await mockGetSelectedText();
    } catch { }

    if (selectedText && (selectedText.includes("=") || selectedText.includes("|"))) {
        console.log(`Auto-parsed from Selection: ${selectedText}`);
        return;
    }

    // 2. Check Clipboard
    let clipboardText = "";
    try {
        clipboardText = await mockClipboardReadText();
    } catch { }

    if (clipboardText && (clipboardText.includes("=") || clipboardText.includes("|"))) {
        console.log(`Auto-parsed from Clipboard: ${clipboardText}`);
        return;
    }

    console.log("No valid input found. Showing Form.");
}

testAutoParse();
