import { closeMainWindow, Clipboard, showHUD, getPreferenceValues } from "@raycast/api";

const minionWords: string[] = [
  "pepete",
  "aaaaaah",
  "uuuhhh",
  "jiji",
  "hahaha",
  "jeje",
  "wiiiii",
  "bananaaaa",
  "bappleees",
  "potatoooo",
  "para tú",
  "la bodaaa",
  "poulet tikka masala",
  "daa",
  "hana dul sae",
  "belloo!",
  "poopayee",
  "tank yuuu!",
  "me want bananaaa!",
  "underweaaar",
  "bee do bee do bee do",
  "tulaliloo",
  "ti aamoo!",
  "tatata bala tu",
  "baboiii",
  "po kass",
  "gelatooo",
  "butt",
  "chasy",
];

interface MinionIpsumParams {
  numberOfParagraphs?: number;
  sentencesPerParagraph?: number;
  wordsPerSentence?: number;
}

function getRandomWord(): string {
  const randIndex = Math.floor(Math.random() * minionWords.length);
  return minionWords[randIndex];
}

function capitalizeFirstLetter(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function generateMinionIpsum({
  numberOfParagraphs = 4,
  sentencesPerParagraph = 5,
  wordsPerSentence = 6,
}: MinionIpsumParams = {}): string {
  const result = [];

  for (let i = 0; i < numberOfParagraphs; i++) {
    const paragraph = [];
    for (let j = 0; j < sentencesPerParagraph; j++) {
      const sentence = [];
      for (let k = 0; k < wordsPerSentence; k++) {
        sentence.push(getRandomWord());
      }
      paragraph.push(capitalizeFirstLetter(sentence.join(" ")) + ".");
    }
    result.push(capitalizeFirstLetter(paragraph.join(" ")));
  }

  return result.join("\n\n");
}

export const produceOutput = async (content: string) => {
  const { action: preference = "clipboard" } = getPreferenceValues();

  switch (preference) {
    case "clipboard":
      await Clipboard.copy(content);
      showHUD("Copied to clipboard! 📋");
      break;

    case "paste":
      await Clipboard.paste(content);
      showHUD("Pasted to active app! 📝");
      break;
  }

  await closeMainWindow();
};
