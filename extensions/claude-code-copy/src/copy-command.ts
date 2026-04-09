import { Clipboard, getSelectedText, showToast, Toast } from "@raycast/api";

function clean(raw: string): { text: string; strippedBang: boolean } {
  let t = raw;

  const ESC = String.fromCharCode(0x1b);
  // Strip ANSI escape sequences (colors, cursor movement, etc.)
  t = t.replace(new RegExp(ESC + "\\[[0-9;?]*[a-zA-Z]", "g"), "");
  // Strip any remaining ESC sequences
  t = t.replace(new RegExp(ESC + "[^\\n]*", "g"), "");
  // Expand tabs
  t = t.replace(/\t/g, "    ");

  let strippedBang = false;
  const BOX_ONLY = /^[\s│┤├─┼┐┘┌└┬┴╔╗╚╝╠╣╦╩╬═║╭╮╯╰▀▄█░▒▓·∙•×\-=+~*#@^_|/\\]+$/;
  const SPIN_ONLY = /^[\s⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏⠛⠟⠯⠷⠿⣿⣾⣽⣻⢿⡿⣟⣯⣷⠾⠽⠻⠺]+$/;

  const kept: string[] = [];
  for (let ln of t.split("\n")) {
    ln = ln.trimEnd();
    if (BOX_ONLY.test(ln) || SPIN_ONLY.test(ln)) continue;
    // Strip │ / ┃ column-padding prefix
    ln = ln.replace(/^[│┃]\s?/, "");
    // Strip UI glyphs at line start (⎿ ● ○ ▸ ► ◉ etc.)
    ln = ln.replace(/^\s*[⎿●○◆◇▸►◉⊙✦✧]\s+/, "");
    ln = ln.trim();
    // Strip leading ! prefix (Claude Code shell prefix)
    if (ln.startsWith("! ")) {
      ln = ln.slice(2);
      strippedBang = true;
    }
    kept.push(ln);
  }

  // Collapse consecutive blank lines to max 1
  const out: string[] = [];
  let wasBlank = false;
  for (const ln of kept) {
    if (ln === "") {
      if (!wasBlank) out.push(ln);
      wasBlank = true;
    } else {
      out.push(ln);
      wasBlank = false;
    }
  }

  while (out.length && out[0] === "") out.shift();
  while (out.length && out[out.length - 1] === "") out.pop();

  return { text: out.join("\n"), strippedBang };
}

export default async function Command() {
  try {
    const text = await getSelectedText().catch(() => null);
    if (!text?.trim()) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No text selected",
      });
      return;
    }

    const { text: cleaned, strippedBang } = clean(text);
    await Clipboard.copy(cleaned);

    if (cleaned === text) {
      await showToast({
        style: Toast.Style.Success,
        title: "Already clean — copied as-is",
      });
    } else if (strippedBang) {
      await showToast({
        style: Toast.Style.Success,
        title: 'Stripped !. Enter "!" before sending to enter bash mode.',
      });
    } else {
      await showToast({
        style: Toast.Style.Success,
        title: "Cleaned & copied",
      });
    }
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Error",
      message: String(error),
    });
  }
}
