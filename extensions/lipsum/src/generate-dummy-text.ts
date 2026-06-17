import { LaunchProps, getPreferenceValues, showHUD, Clipboard } from "@raycast/api";
import { safeNumberArg } from "./utils";
import { showFailureToast } from "@raycast/utils";

interface Preferences {
  defaultLanguage: "ja" | "en";
}

interface Arguments {
  language?: "ja" | "en";
  numberOfChars: string;
}

export default async function main(props: LaunchProps<{ arguments: Arguments }>) {
  try {
    const preferences = getPreferenceValues<Preferences>();
    const { language, numberOfChars } = props.arguments;

    const selectedLanguage = language || preferences.defaultLanguage || "en"; // Use selected language, then default preference, then English as fallback
    const safeNumberOfChars = safeNumberArg(numberOfChars);

    let dummyText = "";
    if (selectedLanguage === "ja") {
      dummyText = generateJapaneseDummyText(safeNumberOfChars);
    } else {
      dummyText = generateEnglishDummyText(safeNumberOfChars);
    }

    await Clipboard.copy(dummyText);
    await showHUD("Copied dummy text to clipboard");
  } catch (error) {
    showFailureToast(error, { title: "Failed to generate dummy text" });
  }
}

const generateJapaneseDummyText = (numberOfChars: number): string => {
  // Common Japanese words categorized by type and length
  const nouns = [
    "私",
    "彼",
    "彼女",
    "人",
    "子供",
    "学生",
    "先生",
    "友達",
    "家族",
    "会社",
    "学校",
    "社会",
    "国",
    "世界",
    "時間",
    "場所",
    "言葉",
    "気持ち",
    "考え",
    "仕事",
    "生活",
    "問題",
    "方法",
    "意味",
    "関係",
    "状況",
    "経験",
    "結果",
    "技術",
    "情報",
    "研究",
    "開発",
    "文化",
    "教育",
    "環境",
    "歴史",
    "未来",
    "現実",
    "自然",
    "動物",
    "季節",
    "天気",
    "道具",
    "音楽",
    "映画",
    "本",
    "料理",
    "旅行",
    "電話",
    "車",
  ];

  const verbs = [
    "する",
    "ある",
    "いる",
    "なる",
    "見る",
    "行く",
    "来る",
    "思う",
    "言う",
    "書く",
    "読む",
    "食べる",
    "飲む",
    "話す",
    "聞く",
    "考える",
    "感じる",
    "使う",
    "作る",
    "始める",
    "終わる",
    "続ける",
    "変わる",
    "変える",
    "助ける",
    "教える",
    "学ぶ",
    "知る",
    "出る",
    "入る",
    "帰る",
    "歩く",
    "走る",
    "休む",
    "寝る",
    "起きる",
    "出来る",
    "分かる",
    "持つ",
    "買う",
    "売る",
    "待つ",
    "会う",
    "遊ぶ",
    "働く",
    "住む",
    "生きる",
    "死ぬ",
    "送る",
    "受ける",
  ];

  const adjectives = [
    "良い",
    "悪い",
    "大きい",
    "小さい",
    "新しい",
    "古い",
    "多い",
    "少ない",
    "高い",
    "低い",
    "長い",
    "短い",
    "強い",
    "弱い",
    "難しい",
    "簡単",
    "忙しい",
    "暇",
    "楽しい",
    "嬉しい",
    "悲しい",
    "寂しい",
    "面白い",
    "つまらない",
    "綺麗",
    "不思議",
    "素晴らしい",
    "美しい",
    "醜い",
    "明るい",
    "暗い",
    "早い",
    "遅い",
    "速い",
    "熱い",
    "冷たい",
    "甘い",
    "辛い",
    "苦い",
  ];

  const adverbs = [
    "とても",
    "非常に",
    "本当に",
    "かなり",
    "少し",
    "ちょっと",
    "全く",
    "特に",
    "やはり",
    "確かに",
    "実は",
    "もちろん",
    "必ず",
    "例えば",
    "たぶん",
    "恐らく",
    "多分",
    "時々",
    "常に",
    "すぐに",
    "既に",
    "早く",
    "ゆっくり",
    "今",
    "今日",
    "明日",
    "昨日",
    "前",
    "後",
    "最近",
  ];

  const particles = [
    "は",
    "が",
    "を",
    "に",
    "へ",
    "で",
    "と",
    "から",
    "まで",
    "の",
    "や",
    "か",
    "より",
    "ね",
    "よ",
    "も",
    "な",
    "ば",
    "さ",
    "し",
  ];

  const sentenceEndings = [
    "です",
    "ます",
    "でした",
    "ました",
    "でしょう",
    "ましょう",
    "だ",
    "だった",
    "だろう",
    "ではない",
    "ません",
    "ではなかった",
    "ませんでした",
    "ではないでしょう",
    "ないでしょう",
  ];

  const conjunctions = [
    "そして",
    "しかし",
    "または",
    "なぜなら",
    "それから",
    "それに",
    "だから",
    "でも",
    "また",
    "ところで",
    "一方",
    "実際",
    "つまり",
    "それで",
    "ですから",
    "ただし",
    "そうすると",
    "その結果",
    "確かに",
    "例えば",
  ];

  const punctuation = ["。", "。", "。", "。", "？", "！", "、", "、", "、"];

  // Sentence structure patterns - defines common Japanese sentence structures
  const sentencePatterns = [
    // Basic patterns: Noun + Particle + Verb + Ending
    () => {
      const noun = nouns[Math.floor(Math.random() * nouns.length)];
      const particle = particles[Math.floor(Math.random() * 5)]; // は、が、を、に、へ
      const verb = verbs[Math.floor(Math.random() * verbs.length)];
      const ending = sentenceEndings[Math.floor(Math.random() * sentenceEndings.length)];
      return `${noun}${particle}${verb}${ending}`;
    },

    // Noun + Adjective + Ending
    () => {
      const noun = nouns[Math.floor(Math.random() * nouns.length)];
      const particle = "は";
      const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
      const ending = sentenceEndings[Math.floor(Math.random() * 5)]; // Subset of endings that work well with adjectives
      return `${noun}${particle}${adj}${ending}`;
    },

    // Adverb + Verb + Ending
    () => {
      const adverb = adverbs[Math.floor(Math.random() * adverbs.length)];
      const verb = verbs[Math.floor(Math.random() * verbs.length)];
      const ending = sentenceEndings[Math.floor(Math.random() * sentenceEndings.length)];
      return `${adverb}${verb}${ending}`;
    },

    // Noun + Particle + Noun + Particle + Verb + Ending
    () => {
      const noun1 = nouns[Math.floor(Math.random() * nouns.length)];
      const particle1 = particles[Math.floor(Math.random() * 5)];
      const noun2 = nouns[Math.floor(Math.random() * nouns.length)];
      const particle2 = particles[Math.floor(Math.random() * 5)];
      const verb = verbs[Math.floor(Math.random() * verbs.length)];
      const ending = sentenceEndings[Math.floor(Math.random() * sentenceEndings.length)];
      return `${noun1}${particle1}${noun2}${particle2}${verb}${ending}`;
    },

    // Adverb + Adjective + Noun + Ending
    () => {
      const adverb = adverbs[Math.floor(Math.random() * adverbs.length)];
      const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
      const noun = nouns[Math.floor(Math.random() * nouns.length)];
      const particle = "は";
      const ending = sentenceEndings[Math.floor(Math.random() * 5)];
      return `${adverb}${adj}${noun}${particle}${ending}`;
    },
  ];

  let result = "";
  let currentPhrase = "";

  while (result.length < numberOfChars) {
    // Decide if we should start a new sentence or continue with a conjunction
    const startNewSentence =
      result.length === 0 || result.slice(-1) === "。" || result.slice(-1) === "！" || result.slice(-1) === "？";

    if (startNewSentence) {
      // Generate a new sentence based on a random pattern
      const randomPatternIndex = Math.floor(Math.random() * sentencePatterns.length);
      currentPhrase = sentencePatterns[randomPatternIndex]();
    } else {
      // Add a conjunction to continue the sentence
      const conjunction = conjunctions[Math.floor(Math.random() * conjunctions.length)];
      currentPhrase = `${conjunction}${sentencePatterns[Math.floor(Math.random() * sentencePatterns.length)]()}`;
    }

    // Add punctuation
    const punctuationMark = punctuation[Math.floor(Math.random() * punctuation.length)];
    currentPhrase += punctuationMark;

    // Add a space between sentences (if not the first sentence)
    if (!startNewSentence) {
      currentPhrase = "　" + currentPhrase;
    }

    // Check if we can fit the whole phrase
    if (result.length + currentPhrase.length <= numberOfChars) {
      result += currentPhrase;
    } else {
      // We can't fit the whole phrase, so trim and break
      const remainingChars = numberOfChars - result.length;
      result += currentPhrase.substring(0, remainingChars);
      break;
    }
  }

  // Trim to exact character count and ensure proper ending
  let finalResult = result.substring(0, numberOfChars);

  // If the text doesn't end with proper punctuation and we have enough characters
  const lastChar = finalResult.slice(-1);
  if (lastChar !== "。" && lastChar !== "！" && lastChar !== "？" && finalResult.length > 5) {
    // Replace the last character with a period
    finalResult = finalResult.slice(0, -1) + "。";
  }

  return finalResult;
};

const generateEnglishDummyText = (numberOfChars: number): string => {
  // Common English words of different lengths
  const words = [
    // Short words (1-3 chars)
    "a",
    "an",
    "the",
    "to",
    "of",
    "in",
    "is",
    "it",
    "on",
    "at",
    "by",
    "as",
    "or",
    "and",
    "but",
    // Medium words (4-6 chars)
    "about",
    "after",
    "again",
    "along",
    "also",
    "asked",
    "away",
    "back",
    "been",
    "being",
    "below",
    "between",
    "beyond",
    "both",
    "color",
    "could",
    "design",
    "each",
    "early",
    "ever",
    "every",
    "field",
    "first",
    "found",
    "from",
    "great",
    "group",
    "have",
    "house",
    "idea",
    "image",
    "into",
    "know",
    "large",
    "later",
    "less",
    "light",
    "like",
    "line",
    "made",
    "make",
    "many",
    "might",
    "more",
    "most",
    "move",
    "much",
    "must",
    "name",
    "never",
    "next",
    "often",
    "only",
    "open",
    "over",
    "part",
    "place",
    "point",
    "power",
    "right",
    "same",
    "seen",
    "side",
    "since",
    "small",
    "some",
    "sound",
    "still",
    "study",
    "such",
    "take",
    "than",
    "that",
    "their",
    "them",
    "then",
    "there",
    "these",
    "they",
    "thing",
    "think",
    "this",
    "those",
    "three",
    "time",
    "under",
    "very",
    "water",
    "way",
    "well",
    "were",
    "what",
    "when",
    "where",
    "which",
    "while",
    "who",
    "will",
    "with",
    "work",
    "world",
    "would",
    "year",
    "your",
    // Longer words (7+ chars)
    "another",
    "because",
    "building",
    "business",
    "children",
    "community",
    "computer",
    "consider",
    "continue",
    "creative",
    "cultural",
    "different",
    "discover",
    "education",
    "everyone",
    "experience",
    "following",
    "government",
    "important",
    "including",
    "information",
    "knowledge",
    "learning",
    "material",
    "national",
    "necessary",
    "original",
    "personal",
    "possible",
    "practice",
    "question",
    "research",
    "resource",
    "something",
    "sometimes",
    "structure",
    "together",
    "understand",
  ];

  // Common punctuation and sentence structures
  const punctuation = [".", ".", ".", ".", "?", "!", ",", ";", ":"];
  const sentenceStarters = [
    "The",
    "A",
    "In",
    "When",
    "If",
    "Although",
    "While",
    "Since",
    "Because",
    "As",
    "After",
    "Before",
    "However",
    "Therefore",
    "Consequently",
    "Nevertheless",
    "Moreover",
    "Furthermore",
  ];

  let result = "";

  // Start with a capital letter
  let currentSentence = sentenceStarters[Math.floor(Math.random() * sentenceStarters.length)] + " ";
  let wordCount = 0;

  while (result.length < numberOfChars) {
    // Add a word
    const word = words[Math.floor(Math.random() * words.length)];
    currentSentence += word;
    wordCount++;

    // Determine if we should end the sentence
    const shouldEndSentence = (wordCount > 5 && Math.random() < 0.2) || wordCount > 15;

    if (shouldEndSentence) {
      // End the sentence with a period, question mark, or exclamation point
      const endPunctuation = punctuation[Math.floor(Math.random() * 3)]; // Only ., ?, !
      currentSentence += endPunctuation + " ";

      // Start a new sentence
      wordCount = 0;
      if (result.length + currentSentence.length <= numberOfChars) {
        result += currentSentence;
        currentSentence = sentenceStarters[Math.floor(Math.random() * sentenceStarters.length)] + " ";
      } else {
        // We can't fit the whole sentence, so trim and break
        const remainingChars = numberOfChars - result.length;
        result += currentSentence.substring(0, remainingChars);
        break;
      }
    } else {
      // Continue the sentence with a comma, semicolon, or a space
      const continueWithPunctuation = Math.random() < 0.15;
      if (continueWithPunctuation) {
        const midPunctuation = punctuation[3 + Math.floor(Math.random() * 3)]; // Only ,, ;, :
        currentSentence += midPunctuation + " ";
      } else {
        currentSentence += " ";
      }

      // Check if we can fit the whole sentence so far
      if (result.length + currentSentence.length > numberOfChars) {
        const remainingChars = numberOfChars - result.length;
        result += currentSentence.substring(0, remainingChars);
        break;
      }
    }
  }

  // Trim to exact character count
  return result.substring(0, numberOfChars);
};
