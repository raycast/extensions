/* eslint-disable @typescript-eslint/no-require-imports */
const { parse } = require("node-html-parser");
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

/**
 * Extract minimal HTML keeping the hierarchy that leads to attendance table
 */
function extractMinimalAttendanceHtml(html) {
  const root = parse(html);
  
  // Find the main container that holds the attendance content
  // Structure: main > jbc-container > card > card-body > search-result > table-responsive > table
  const main = root.querySelector("main");
  if (!main) {
    throw new Error("No main element found in HTML");
  }

  // Find the card that contains the attendance table
  const card = main.querySelector(".card.jbc-card");
  if (!card) {
    throw new Error("No attendance card found in HTML");
  }

  // Find the search-result div that contains the attendance table
  const searchResult = card.querySelector("#search-result");
  if (!searchResult) {
    throw new Error("No search-result div found in card");
  }

  // Find the attendance table within search-result - it should have thead and tbody
  const tables = searchResult.querySelectorAll("table.jbc-table");
  let table = null;
  for (const t of tables) {
    if (t.querySelector("thead") && t.querySelector("tbody")) {
      table = t;
      break;
    }
  }
  if (!table) {
    throw new Error("No attendance table with thead/tbody found in search-result");
  }

  // Remove dropdown menus and font tags from table cells but keep everything else
  const rows = table.querySelectorAll("tbody tr");
  rows.forEach((row) => {
    const cells = row.querySelectorAll("td");
    cells.forEach((cell) => {
      // Remove dropdown menus from date cell (first cell)
      const dropdown = cell.querySelector(".dropdown-menu");
      if (dropdown) {
        dropdown.remove();
      }
      
      // Remove all font tags but preserve their text content
      const fontTags = cell.querySelectorAll("font");
      fontTags.forEach((font) => {
        const text = font.text;
        const textNode = parse(text).querySelector("body");
        if (textNode) {
          font.replaceWith(textNode.innerHTML);
        } else {
          font.replaceWith(text);
        }
      });
    });
  });
  
  // Also remove font tags from thead
  const thead = table.querySelector("thead");
  if (thead) {
    const theadFontTags = thead.querySelectorAll("font");
    theadFontTags.forEach((font) => {
      const text = font.text;
      font.replaceWith(text);
    });
  }

  // Remove collapse section (summary info) - we can add it back if needed for summary parsing tests
  const collapseInfo = searchResult.querySelector("#collapseInfo");
  if (collapseInfo) {
    collapseInfo.remove();
  }

  // Remove form and other non-table elements from card-body, keep only search-result
  const cardBody = card.querySelector(".card-body");
  if (cardBody) {
    // Remove everything except search-result
    const children = Array.from(cardBody.childNodes);
    children.forEach((child) => {
      if (child.id !== "search-result" && child.id !== "message-box") {
        child.remove();
      }
    });
  }

  // Remove header, navigation, sidebar, footer, scripts, styles
  const head = root.querySelector("head");
  if (head) {
    // Keep only charset meta
    const children = Array.from(head.childNodes);
    children.forEach((child) => {
      if (child.tagName !== "META" || child.getAttribute("charset") !== "utf-8") {
        child.remove();
      }
    });
  }

  // Remove header, sidebar, footer from body
  const body = root.querySelector("body");
  if (body) {
    const header = body.querySelector("header");
    if (header) header.remove();
    const sidebar = body.querySelector("#sidemenu, #sidemenu-closed");
    if (sidebar) sidebar.remove();
    const footer = body.querySelector("footer");
    if (footer) footer.remove();
    
    // Keep only main content
    const bodyChildren = Array.from(body.childNodes);
    bodyChildren.forEach((child) => {
      if (child.tagName !== "MAIN" && child.tagName !== "SCRIPT") {
        child.remove();
      }
    });
  }

  // Create minimal HTML document preserving the hierarchy
  const minimalHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Attendance Fixture</title>
</head>
<body>
  ${main.outerHTML}
</body>
</html>`;

  return minimalHtml;
}

/**
 * Extract minimal modify page HTML keeping only the form structure
 */
function extractMinimalModifyHtml(html) {
  const root = parse(html);

  // Find the form
  const form = root.querySelector("form");
  if (!form) {
    throw new Error("No form element found in HTML");
  }

  // Keep only essential form fields: token, client_id, employee_id, group_id, notice, time
  const fieldsToKeep = ["token", "client_id", "employee_id", "group_id", "notice", "time"];
  const allInputs = form.querySelectorAll("input, select, textarea");
  
  allInputs.forEach((input) => {
    const name = input.getAttribute("name");
    if (!name || !fieldsToKeep.includes(name)) {
      input.remove();
    }
  });

  // Remove all scripts
  const scripts = form.querySelectorAll("script");
  scripts.forEach((script) => script.remove());

  // Remove all labels that don't have a corresponding input
  const labels = form.querySelectorAll("label");
  labels.forEach((label) => {
    const forAttr = label.getAttribute("for");
    if (forAttr && !form.querySelector(`#${forAttr}`)) {
      label.remove();
    }
  });

  // Create minimal HTML document
  const minimalHtml = `<!DOCTYPE html>
<html>
<head>
  <title>Modify Attendance</title>
</head>
<body>
  ${form.outerHTML}
</body>
</html>`;

  return minimalHtml;
}

/**
 * Main function
 */
function main() {
  const sandboxFixturesDir = path.join(__dirname, "..", "sandbox", "fixtures");
  const testFixturesDir = path.join(__dirname, "..", "test", "fixtures");

  // Ensure test/fixtures directory exists
  if (!fs.existsSync(testFixturesDir)) {
    fs.mkdirSync(testFixturesDir, { recursive: true });
  }

  const files = [
    { 
      input: "attendance-previous.html", 
      output: "attendance-previous.html",
      type: "attendance"
    },
    { 
      input: "attendance-current.html", 
      output: "attendance-current.html",
      type: "attendance"
    },
    { 
      input: "modify-page.html", 
      output: "modify-page.html",
      type: "modify"
    },
  ];

  for (const file of files) {
    const inputPath = path.join(
      file.type === "modify" ? testFixturesDir : sandboxFixturesDir,
      file.input
    );
    const outputPath = path.join(testFixturesDir, file.output);

    // Skip if input file doesn't exist
    if (!fs.existsSync(inputPath)) {
      console.log(`Skipping ${file.input} - file not found at ${inputPath}`);
      continue;
    }

    console.log(`Processing ${file.input}...`);
    const html = fs.readFileSync(inputPath, "utf-8");
    
    let minimalHtml;
    if (file.type === "attendance") {
      minimalHtml = extractMinimalAttendanceHtml(html);
    } else if (file.type === "modify") {
      minimalHtml = extractMinimalModifyHtml(html);
    } else {
      throw new Error(`Unknown file type: ${file.type}`);
    }
    
    fs.writeFileSync(outputPath, minimalHtml, "utf-8");
    
    // Format with prettier
    try {
      execSync(`npx prettier --write "${outputPath}"`, { stdio: "inherit" });
      console.log(`Formatted ${file.output} with prettier`);
    } catch (error) {
      console.warn(`Warning: Failed to format ${file.output} with prettier:`, error.message);
    }
    
    console.log(`Saved minimal fixture to ${file.output}`);
  }

  console.log("Done!");
}

main();
