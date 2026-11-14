import { closeMainWindow, Clipboard, getPreferenceValues, showToast, Toast } from "@raycast/api";
import { LoremIpsum } from "lorem-ipsum";

// don't want to cause a heap error, so cap it 😱
const LOREM_IPSUM_MAX_NUMBER = 1000;

const loremIpsumOptions = {
  sentencesPerParagraph: {
    max: 8,
    min: 4,
  },
  wordsPerSentence: {
    max: 16,
    min: 4,
  },
};

const generator = new LoremIpsum(loremIpsumOptions);

export const generateParagraphs = (count: number) => {
  return Array.from(Array(count))
    .map(() =>
      generator.generateSentences(
        Math.floor(
          Math.random() *
            (loremIpsumOptions.sentencesPerParagraph.max - loremIpsumOptions.sentencesPerParagraph.min + 1),
        ) + loremIpsumOptions.sentencesPerParagraph.min,
      ),
    )
    .join("\r\n\r\n"); // newline + seperator line
};

export const generateSentences = (count: number) => {
  return generator.generateSentences(count);
};

export const generateWords = (count: number) => {
  return generator.generateWords(count);
};

interface EmphasisSegment {
  text: string;
  emphasis?: "bold" | "italic";
}

type DocumentBlock =
  | { kind: "heading"; level: number; text: string }
  | { kind: "paragraph"; segments: EmphasisSegment[] }
  | { kind: "list"; ordered: boolean; items: string[] }
  | { kind: "quote"; text: string };

const pickRandom = <T,>(items: T[]): T => items[Math.floor(Math.random() * items.length)];

const generateSentenceWithEmphasis = (): EmphasisSegment[] => {
  const sentence = generator.generateSentences(1);
  const words = sentence.split(" ");

  if (words.length < 3) {
    return [{ text: sentence }];
  }

  const emphasis = pickRandom<EmphasisSegment["emphasis"] | undefined>([undefined, "bold", "italic"]);
  if (!emphasis) {
    return [{ text: sentence }];
  }

  const index = 1 + Math.floor(Math.random() * (words.length - 2));
  return [
    { text: words.slice(0, index).join(" ") + " " },
    { text: words[index], emphasis },
    { text: " " + words.slice(index + 1).join(" ") },
  ];
};

const generateDocumentBlock = (kind: DocumentBlock["kind"] | "heading"): DocumentBlock => {
  switch (kind) {
    case "heading":
      return {
        kind: "heading",
        level: pickRandom([2, 3]),
        text: generator.generateWords(2 + Math.floor(Math.random() * 4)),
      };
    case "list": {
      const itemCount = 3 + Math.floor(Math.random() * 3);
      return {
        kind: "list",
        ordered: Math.random() < 0.5,
        items: Array.from(Array(itemCount), () => generator.generateWords(3 + Math.floor(Math.random() * 4))),
      };
    }
    case "quote":
      return { kind: "quote", text: generator.generateSentences(1) };
    default:
      return {
        kind: "paragraph",
        segments: generateSentenceWithEmphasis(),
      };
  }
};

const generateDocument = (blockCount: number): DocumentBlock[] => {
  const blocks: DocumentBlock[] = [generateDocumentBlock("heading")];

  const remainingCount = Math.max(0, blockCount - 1);
  for (let i = 0; i < remainingCount; i++) {
    blocks.push(generateDocumentBlock(pickRandom(["paragraph", "paragraph", "paragraph", "list", "quote"])));
  }

  return blocks;
};

const renderMarkdownSegments = (segments: EmphasisSegment[]) =>
  segments
    .map((segment) => {
      if (segment.emphasis === "bold") {
        return `**${segment.text}**`;
      }
      if (segment.emphasis === "italic") {
        return `*${segment.text}*`;
      }
      return segment.text;
    })
    .join("");

export const randomDocumentBlockCount = (): number => {
  return 3 + Math.floor(Math.random() * 6);
};

export const generateMarkdownDocument = (blockCount: number): string => {
  return generateDocument(blockCount)
    .map((block) => {
      switch (block.kind) {
        case "heading":
          return `${"#".repeat(block.level)} ${block.text}`;
        case "list":
          return block.items.map((item, index) => (block.ordered ? `${index + 1}. ${item}` : `- ${item}`)).join("\n");
        case "quote":
          return `> ${block.text}`;
        default:
          return renderMarkdownSegments(block.segments);
      }
    })
    .join("\n\n");
};

const renderHtmlSegments = (segments: EmphasisSegment[]) =>
  segments
    .map((segment) => {
      if (segment.emphasis === "bold") {
        return `<strong>${segment.text}</strong>`;
      }
      if (segment.emphasis === "italic") {
        return `<em>${segment.text}</em>`;
      }
      return segment.text;
    })
    .join("");

export const generateHtmlDocument = (blockCount: number): string => {
  return generateDocument(blockCount)
    .map((block) => {
      switch (block.kind) {
        case "heading":
          return `<h${block.level}>${block.text}</h${block.level}>`;
        case "list": {
          const tag = block.ordered ? "ol" : "ul";
          return `<${tag}>\n${block.items.map((item) => `  <li>${item}</li>`).join("\n")}\n</${tag}>`;
        }
        case "quote":
          return `<blockquote>\n  <p>${block.text}</p>\n</blockquote>`;
        default:
          return `<p>${renderHtmlSegments(block.segments)}</p>`;
      }
    })
    .join("\n\n");
};

export const safeLoremIpsumNumberArg = async (arg: string | undefined) => {
  if (!arg) {
    arg = "1";
  }

  try {
    const parseableNumber = parseInt(arg, 10);

    // number and valid/within range?
    if (isNaN(parseableNumber) || parseableNumber > LOREM_IPSUM_MAX_NUMBER) {
      return {
        error: {
          message: `Please enter a valid integer number, no more than ${LOREM_IPSUM_MAX_NUMBER}`,
        },
        safeLoremIpsumNumber: null,
      };
    }

    // all good
    return {
      error: null,
      safeLoremIpsumNumber: parseableNumber,
    };
  } catch {
    // generic error
    return {
      error: {
        message: "Something went wrong",
      },
      safeLoremIpsumNumber: null,
    };
  }
};

export const showError = async (msg: string) => {
  await closeMainWindow({ clearRootSearch: true });
  await showToast(Toast.Style.Failure, msg);
};

export const produceOutput = async (content: string) => {
  const { action } = getPreferenceValues();

  await closeMainWindow({ clearRootSearch: true });

  switch (action) {
    case "clipboard":
      await Clipboard.copy(content);
      await showToast(Toast.Style.Success, "Copied to clipboard! 📋");
      break;

    case "paste":
      await Clipboard.paste(content);
      await showToast(Toast.Style.Success, "Pasted to active app! 📝");
      break;

    case "pasteAndCopy":
      await Clipboard.paste(content);
      await Clipboard.copy(content);
      await showToast(Toast.Style.Success, "Pasted to active app and copied to clipboard! 📋");
      break;
  }
};
