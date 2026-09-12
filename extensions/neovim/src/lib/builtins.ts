// Comprehensive Vim normal-mode keymaps from vim-bro cheat sheet.
// Used as fallback when nvim_get_keymap doesn't cover built-in motions.

import { KeymapEntry } from "./types";

// Helper to build entries
function b(lhs: string, desc: string): KeymapEntry {
  return { lhs, rhs: "", desc, source: "builtin" };
}

export const BUILTIN_KEYMAPS: KeymapEntry[] = [
  // --- Cursor movement ---
  b("h", "move cursor left"),
  b("j", "move cursor down"),
  b("k", "move cursor up"),
  b("l", "move cursor right"),
  b("gj", "move cursor down (multi-line text)"),
  b("gk", "move cursor up (multi-line text)"),
  b("H", "move to top of screen"),
  b("M", "move to middle of screen"),
  b("L", "move to bottom of screen"),
  b("w", "jump forward to start of word"),
  b("W", "jump forward to start of WORD"),
  b("e", "jump forward to end of word"),
  b("E", "jump forward to end of WORD"),
  b("b", "jump backward to start of word"),
  b("B", "jump backward to start of WORD"),
  b("ge", "jump backward to end of word"),
  b("gE", "jump backward to end of WORD"),
  b("%", "move to matching character"),
  b("0", "jump to start of line"),
  b("^", "jump to first non-blank character"),
  b("$", "jump to end of line"),
  b("g_", "jump to last non-blank character"),
  b("gg", "go to first line"),
  b("G", "go to last line"),
  b("gd", "move to local declaration"),
  b("gD", "move to global declaration"),
  b("fx", "jump to next occurrence of character x"),
  b("tx", "jump to before next occurrence of character x"),
  b("Fx", "jump to previous occurrence of character x"),
  b("Tx", "jump to after previous occurrence of character x"),
  b(";", "repeat previous f/t/F/T movement"),
  b(",", "repeat previous f/t/F/T movement backward"),
  b("}", "jump to next paragraph"),
  b("{", "jump to previous paragraph"),
  b("zz", "center cursor on screen"),
  b("<C-e>", "scroll screen down one line"),
  b("<C-y>", "scroll screen up one line"),
  b("<C-b>", "move back one full screen"),
  b("<C-f>", "move forward one full screen"),
  b("<C-d>", "move forward half screen"),
  b("<C-u>", "move backward half screen"),

  // --- Insert mode ---
  b("i", "insert before cursor"),
  b("I", "insert at beginning of line"),
  b("a", "insert after cursor"),
  b("A", "insert at end of line"),
  b("o", "open new line below"),
  b("O", "open new line above"),
  b("ea", "insert at end of word"),
  b("<C-h>", "delete char before cursor in insert mode"),
  b("<C-t>", "indent line in insert mode"),
  b("<C-n>", "auto-complete next match"),
  b("<C-p>", "auto-complete previous match"),

  // --- Editing ---
  b("r", "replace a single character"),
  b("R", "enter Replace mode"),
  b("J", "join line below with one space"),
  b("gJ", "join line below without space"),
  b("gwip", "reflow paragraph"),
  b("g~", "switch case up to motion"),
  b("gu", "lowercase up to motion"),
  b("gU", "uppercase up to motion"),
  b("cc", "change entire line"),
  b("C", "change to end of line"),
  b("c$", "change to end of line"),
  b("ciw", "change inner word"),
  b("cw", "change to end of word"),
  b("ce", "change to end of word"),
  b("s", "delete character and substitute"),
  b("S", "delete line and substitute"),
  b("xp", "transpose two letters"),
  b("u", "undo"),
  b("U", "restore last changed line"),
  b("<C-r>", "redo"),
  b(".", "repeat last command"),

  // --- Visual mode ---
  b("v", "start visual mode"),
  b("V", "start linewise visual mode"),
  b("<C-v>", "start visual block mode"),

  // --- Cut and paste ---
  b("yy", "yank a line"),
  b("2yy", "yank 2 lines"),
  b("yw", "yank word"),
  b("yiw", "yank inner word"),
  b("yaw", "yank a word"),
  b("y$", "yank to end of line"),
  b("yip", "yank inner paragraph"),
  b("yap", "yank a paragraph"),
  b("Y", "yank line"),
  b("p", "paste after cursor"),
  b("P", "paste before cursor"),
  b("gp", "paste after and move cursor after"),
  b("gP", "paste before and move cursor after"),
  b("dd", "delete a line"),
  b("2dd", "delete 2 lines"),
  b("dw", "delete word"),
  b("diw", "delete inner word"),
  b("daw", "delete a word"),
  b("D", "delete to end of line"),
  b("d$", "delete to end of line"),
  b("d0", "delete to start of line"),
  b("d^", "delete to first non-blank"),
  b("dG", "delete to end of file"),
  b("dgg", "delete to start of file"),
  b("dip", "delete inner paragraph"),
  b("dap", "delete a paragraph"),
  b("di(", "delete inner parentheses"),
  b("da(", "delete a parentheses block"),
  b('di"', "delete inner double quotes"),
  b('da"', "delete a double quotes block"),
  b("di'", "delete inner single quotes"),
  b("da'", "delete a single quotes block"),
  b("di{", "delete inner braces"),
  b("da{", "delete a braces block"),
  b("dit", "delete inner XML tag"),
  b("dat", "delete a XML tag"),
  b("x", "delete character"),
  b("X", "delete character before cursor"),

  // --- Indent ---
  b(">>", "indent line"),
  b("<<", "de-indent line"),
  b(">%", "indent a block (cursor on brace)"),
  b(">ib", "indent inner block"),
  b(">at", "indent a tag block"),
  b("3==", "re-indent 3 lines"),
  b("=%", "re-indent a block (cursor on brace)"),
  b("=iB", "re-indent inner block"),
  b("gg=G", "re-indent entire buffer"),
  b("]p", "paste and adjust indent"),

  // --- Search ---
  b("/", "search forward"),
  b("?", "search backward"),
  b("n", "repeat search in same direction"),
  b("N", "repeat search in opposite direction"),
  b("*", "search word under cursor forward"),
  b("#", "search word under cursor backward"),

  // --- Jumping ---
  b("<C-o>", "jump list backward"),
  b("<C-i>", "jump list forward"),
  b("gf", "go to file under cursor"),
  b("<C-]>", "jump to tag"),

  // --- Folding ---
  b("zo", "open fold"),
  b("zO", "open fold recursively"),
  b("zc", "close fold"),
  b("zC", "close fold recursively"),
  b("za", "toggle fold"),
  b("zA", "toggle fold recursively"),
  b("zR", "open all folds"),
  b("zM", "close all folds"),
  b("zv", "open folds for this line"),
  b("zm", "fold more"),
  b("zr", "fold less"),
  b("zx", "update folds"),

  // --- Marks ---
  b("m{a-z}", "set mark at cursor"),
  b("`{a-z}", "jump to mark"),
  b("'{a-z}", "jump to mark line"),

  // --- Case ---
  b("~", "toggle case"),
  b("g~~", "swap case line"),
  b("guu", "lowercase line"),
  b("gUU", "uppercase line"),

  // --- Increment/decrement ---
  b("<C-a>", "increment number"),
  b("<C-x>", "decrement number"),

  // --- Scrolling ---
  b("zt", "scroll line to top"),
  b("zb", "scroll line to bottom"),

  // --- Exit ---
  b("ZZ", "save and quit"),
  b("ZQ", "quit without saving"),
];
