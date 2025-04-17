/**
 * Converts a Markdown string to Tana Paste format.
 * @param markdown The input Markdown string.
 * @returns The converted Tana Paste string.
 */
export function markdownToTanaPaste(markdown: string): string {
  const lines = markdown.split("\n");
  let tanaPaste = "%%tana%%\n";
  const outputLines: string[] = [];
  const headingLevelStack: number[] = []; // Tracks heading levels [1, 2]
  const listIndentStack: number[] = []; // Tracks char positions for lists
  const spacePerIndent = 2;

  // --- Stateful applyInlineFormatting function ---
  function applyInlineFormatting(text: string): string {
    let result = "";
    let i = 0;
    const len = text.length;

    while (i < len) {
      // Check for ** or __ (Bold)
      if ((text.startsWith("**", i) || text.startsWith("__", i)) && text[i + 2] && text[i + 2].trim() !== "") {
        const marker = text.substring(i, i + 2);
        const endMarkerIndex = text.indexOf(marker, i + 2);
        if (endMarkerIndex > i + 1) {
          // Lookahead/behind for valid boundaries
          const lookAhead = text[endMarkerIndex + 2] === undefined || text[endMarkerIndex + 2].match(/\s|[.,!?;:)]|$/);
          const lookBehind = text[endMarkerIndex - 1] && text[endMarkerIndex - 1].trim() !== "";
          if (lookAhead && lookBehind) {
            // Recursively format content within markers
            result += "**" + applyInlineFormatting(text.substring(i + 2, endMarkerIndex)) + "**";
            i = endMarkerIndex + 2;
            continue;
          }
        }
      }
      // Check for * or _ (Italic)
      if ((text[i] === "*" || text[i] === "_") && text[i + 1] && text[i + 1].trim() !== "") {
        const marker = text[i];
        // Skip if it's actually part of a bold marker
        if (text[i + 1] === marker) {
          result += text.substring(i, i + 2);
          i += 2;
          continue;
        }
        const endMarkerIndex = text.indexOf(marker, i + 1);
        // Ensure it's not consuming part of a bold marker if same char
        if (endMarkerIndex > i && (text[endMarkerIndex + 1] !== marker || text[endMarkerIndex - 1] !== marker)) {
          // Lookahead/behind for valid boundaries
          const lookAhead = text[endMarkerIndex + 1] === undefined || text[endMarkerIndex + 1].match(/\s|[.,!?;:)]|$/);
          const lookBehind = text[endMarkerIndex - 1] && text[endMarkerIndex - 1].trim() !== "";
          if (lookAhead && lookBehind) {
            // Recursively format content within markers
            result += "__" + applyInlineFormatting(text.substring(i + 1, endMarkerIndex)) + "__";
            i = endMarkerIndex + 1;
            continue;
          }
        }
      }
      // No marker found, append char
      result += text[i];
      i++;
    }
    return result;
  }
  // --- End Inline Formatting Function ---

  lines.forEach((line) => {
    const trimmedLine = line.trim();
    if (trimmedLine === "") return;

    // --- Determine current indentation context ---
    const currentHeadingDepth = headingLevelStack.length; // How many levels deep are we in headings?
    const baseIndent = "  ".repeat(currentHeadingDepth); // Base indent string from headings

    // --- Handle Headings ---
    const headingMatch = trimmedLine.match(/^(#+)\s+(.*)/);
    if (headingMatch) {
      const newHeadingLevel = headingMatch[1].length;
      const content = applyInlineFormatting(headingMatch[2]);

      // <<< Corrected Logic: Calculate indent *before* popping >>>
      let tempHeadingDepth = headingLevelStack.length;
      while (tempHeadingDepth > 0 && newHeadingLevel <= headingLevelStack[tempHeadingDepth - 1]) {
        tempHeadingDepth--;
      }
      const headingLineIndent = "  ".repeat(tempHeadingDepth);

      // Now, adjust the *actual* stack for subsequent lines
      while (headingLevelStack.length > 0 && newHeadingLevel <= headingLevelStack[headingLevelStack.length - 1]) {
        headingLevelStack.pop();
      }
      headingLevelStack.push(newHeadingLevel);
      listIndentStack.length = 0; // Reset list context

      outputLines.push(`${headingLineIndent}- !! ${content}`);
      return;
    }

    // --- Handle Lists ---
    const listItemMatch = line.match(/^(\s*)(?:-|\*|[0-9]+\.)\s+(.*)/);
    if (listItemMatch) {
      const listCharIndent = listItemMatch[1].length;
      let content = listItemMatch[2];

      // --- List stack logic (determining relative indent level) ---
      // Pop levels shallower than the current item
      while (listIndentStack.length > 0 && listCharIndent < listIndentStack[listIndentStack.length - 1]) {
        listIndentStack.pop();
      }
      // Push if it represents a new, deeper indent level compared to the (new) top
      // We only consider it "deeper" if it's at least spacePerIndent more than the previous level
      if (
        listIndentStack.length === 0 ||
        listCharIndent >= (listIndentStack[listIndentStack.length - 1] || -spacePerIndent) + spacePerIndent
      ) {
        // Avoid pushing the same level again if the indent matches the current top
        if (listIndentStack.length === 0 || listCharIndent !== listIndentStack[listIndentStack.length - 1]) {
          listIndentStack.push(listCharIndent);
        }
      }
      // If shallower or equal (and not significantly deeper), the stack is correct after popping.
      // --- End list stack logic ---

      const listRelativeIndentLevel = listIndentStack.length;
      // Additional indent based on relative level (depth 1 = 0 spaces, depth 2 = 2 spaces)
      const additionalListIndent = "  ".repeat(listRelativeIndentLevel > 0 ? listRelativeIndentLevel - 1 : 0);

      content = applyInlineFormatting(content);
      outputLines.push(`${baseIndent}${additionalListIndent}- ${content}`);
      return;
    }

    // --- Handle Paragraphs ---
    listIndentStack.length = 0; // Reset list context
    const content = applyInlineFormatting(trimmedLine);
    outputLines.push(`${baseIndent}- ${content}`);
  });

  tanaPaste += outputLines.join("\n");
  // Ensure ampersands are not escaped
  return tanaPaste.replace(/\\&/g, "&");
}
