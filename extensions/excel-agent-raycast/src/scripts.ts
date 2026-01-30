/**
 * Pre-built AppleScript commands for reliable Excel operations
 * These bypass AI for common tasks to ensure they always work
 * Each script returns a confirmation message
 */

export const SCRIPTS = {
  // Basic formatting
  boldRow1: `
tell application "Microsoft Excel"
  activate
  set bold of font object of row 1 of active sheet to true
  return "Made row 1 bold"
end tell`,

  boldSelection: `
tell application "Microsoft Excel"
  activate
  set bold of font object of selection to true
  return "Made selection bold"
end tell`,

  italicSelection: `
tell application "Microsoft Excel"
  activate
  set italic of font object of selection to true
  return "Made selection italic"
end tell`,

  // Font colors
  blueFont: `
tell application "Microsoft Excel"
  activate
  set color of font object of selection to {0, 0, 255}
  return "Set selection font to blue"
end tell`,

  redFont: `
tell application "Microsoft Excel"
  activate
  set color of font object of selection to {255, 0, 0}
  return "Set selection font to red"
end tell`,

  greenFont: `
tell application "Microsoft Excel"
  activate
  set color of font object of selection to {0, 128, 0}
  return "Set selection font to green"
end tell`,

  // Borders
  addBorders: `
tell application "Microsoft Excel"
  activate
  tell used range of active sheet
    set weight of (get border which edge left) to border weight thin
    set weight of (get border which edge right) to border weight thin
    set weight of (get border which edge top) to border weight thin
    set weight of (get border which edge bottom) to border weight thin
  end tell
  return "Added borders to used range"
end tell`,

  addBordersSelection: `
tell application "Microsoft Excel"
  activate
  tell selection
    set weight of (get border which edge left) to border weight thin
    set weight of (get border which edge right) to border weight thin
    set weight of (get border which edge top) to border weight thin
    set weight of (get border which edge bottom) to border weight thin
  end tell
  return "Added borders to selection"
end tell`,

  // Column sizing
  autoFitColumns: `
tell application "Microsoft Excel"
  activate
  autofit column of used range of active sheet
  return "Auto-fitted columns"
end tell`,

  // Number formats
  formatCurrency: `
tell application "Microsoft Excel"
  activate
  set number format of selection to "$#,##0.00"
  return "Formatted selection as currency"
end tell`,

  formatPercent: `
tell application "Microsoft Excel"
  activate
  set number format of selection to "0.0%"
  return "Formatted selection as percent"
end tell`,

  formatNumber: `
tell application "Microsoft Excel"
  activate
  set number format of selection to "#,##0.00"
  return "Formatted selection as number"
end tell`,

  // Financial modeling style
  financialStyle: `
tell application "Microsoft Excel"
  activate
  tell active sheet
    set rng to used range
    set rowCount to count rows of rng
    set colCount to count columns of rng
    set constCount to 0
    set formulaCount to 0
    repeat with r from 1 to rowCount
      repeat with c from 1 to colCount
        set theCell to cell r of column c of rng
        if value of theCell is not missing value then
          if has formula of theCell then
            set color of font object of theCell to {0, 0, 0}
            set formulaCount to formulaCount + 1
          else
            set color of font object of theCell to {0, 0, 255}
            set constCount to constCount + 1
          end if
        end if
      end repeat
    end repeat
    set bold of font object of row 1 of rng to true
    return "Applied financial style: " & constCount & " inputs (blue), " & formulaCount & " formulas (black), headers bold"
  end tell
end tell`,

  // Read operations
  readSelection: `
tell application "Microsoft Excel"
  set v to value of selection
  if v is missing value then
    return "Selection is empty"
  else
    return v as text
  end if
end tell`,

  readA1: `
tell application "Microsoft Excel"
  set v to value of range "A1" of active sheet
  if v is missing value then
    return "A1 is empty"
  else
    return "A1 = " & (v as text)
  end if
end tell`,

  getSheetInfo: `
tell application "Microsoft Excel"
  tell active sheet
    set info to "Sheet: " & name
    try
      set rng to used range
      set info to info & ", Range: " & (get address of rng)
    end try
    return info
  end tell
end tell`,

  // Cell operations
  clearSelection: `
tell application "Microsoft Excel"
  activate
  clear contents selection
  return "Cleared selection"
end tell`,

  deleteRow: `
tell application "Microsoft Excel"
  activate
  delete entire row of selection
  return "Deleted row"
end tell`,

  insertRow: `
tell application "Microsoft Excel"
  activate
  insert into range (entire row of selection) shift shift down
  return "Inserted row"
end tell`,

  // Freeze panes
  freezeTopRow: `
tell application "Microsoft Excel"
  activate
  tell active sheet
    set freeze panes of (get window 1) to false
    select range "A2"
    set freeze panes of (get window 1) to true
  end tell
  return "Froze top row"
end tell`,

  unfreezePane: `
tell application "Microsoft Excel"
  activate
  set freeze panes of (get window 1) to false
  return "Unfroze panes"
end tell`,

  // Test connection
  testConnection: `
tell application "Microsoft Excel"
  activate
  if not (exists active workbook) then
    return "ERROR: No workbook open"
  end if
  tell active sheet
    set sheetName to name
    set testVal to value of range "A1"
    if testVal is missing value then
      set testVal to "(empty)"
    end if
    return "OK: Sheet '" & sheetName & "', A1=" & (testVal as text)
  end tell
end tell`,
};

/**
 * Check if an instruction matches a built-in script
 */
export function findBuiltInScript(instruction: string): string | null {
  const lower = instruction.toLowerCase();

  // Test
  if (lower.includes("test") && lower.includes("connection")) {
    return SCRIPTS.testConnection;
  }

  // Bold
  if (
    lower.includes("bold") &&
    (lower.includes("row 1") ||
      lower.includes("first row") ||
      lower.includes("header"))
  ) {
    return SCRIPTS.boldRow1;
  }
  if (lower.includes("bold") && lower.includes("selection")) {
    return SCRIPTS.boldSelection;
  }

  // Financial style
  if (lower.includes("financial") && lower.includes("style")) {
    return SCRIPTS.financialStyle;
  }
  if (
    (lower.includes("blue") && lower.includes("input")) ||
    (lower.includes("blue") && lower.includes("constant"))
  ) {
    return SCRIPTS.financialStyle;
  }

  // Borders
  if (lower.includes("border") && !lower.includes("selection")) {
    return SCRIPTS.addBorders;
  }
  if (lower.includes("border") && lower.includes("selection")) {
    return SCRIPTS.addBordersSelection;
  }

  // Auto-fit
  if (
    (lower.includes("auto") && lower.includes("fit")) ||
    lower.includes("autofit")
  ) {
    return SCRIPTS.autoFitColumns;
  }

  // Formatting
  if (lower.includes("currency") || lower.includes("dollar")) {
    return SCRIPTS.formatCurrency;
  }
  if (lower.includes("percent")) {
    return SCRIPTS.formatPercent;
  }

  // Read
  if (lower.includes("read") && lower.includes("selection")) {
    return SCRIPTS.readSelection;
  }

  // Clear
  if (lower.includes("clear") && lower.includes("selection")) {
    return SCRIPTS.clearSelection;
  }

  // Freeze
  if (
    lower.includes("freeze") &&
    (lower.includes("row") || lower.includes("top"))
  ) {
    return SCRIPTS.freezeTopRow;
  }
  if (lower.includes("unfreeze")) {
    return SCRIPTS.unfreezePane;
  }

  return null;
}
