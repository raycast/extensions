import { Clipboard, showToast, Toast, open } from "@raycast/api";

export default async function Command(props: { arguments: { word: string } }) {
  let { word } = props.arguments;

  word = word.trim().toLowerCase();

  // 1. Validation
  if (!word) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Please provide a word",
    });
    return;
  }

  if (/[^a-zA-Z]/.test(word)) {
    await showToast({
      style: Toast.Style.Failure,
      title: word.includes(" ") ? "Word cannot contain spaces" : "Word can only contain letters",
    });
    return;
  }

  // 2. Create link
  const obfuscatedWordParam = convertWord(word);
  const wordleLink = `https://mywordle.strivemath.com/?word=${obfuscatedWordParam}`;

  // 3. Return result
  Clipboard.copy(wordleLink);
  await showToast({
    style: Toast.Style.Success,
    title: "Custom Wordle Created",
    message: `Link copied to clipboard`,
    primaryAction: {
      title: "Open Link",
      onAction: () => open(wordleLink),
    },
  });
}

// Obfuscation Algorithm - Do not modify
function convertWord(w: string) {
  let r = "";
  const k = "wordle";
  for (let i = 0, j = 0; i < w.length; i++, j = (j + 1) % k.length) {
    const c = w[i];
    if (/[a-zA-Z]/.test(c)) {
      const u = c === c.toUpperCase(),
        b = u ? 65 : 97;
      r += String.fromCharCode(
        ((c.charCodeAt(0) + (u ? k[j].toUpperCase() : k[j].toLowerCase()).charCodeAt(0) - 2 * b) % 26) + b,
      );
    } else {
      r += c;
    }
  }
  return r;
}
