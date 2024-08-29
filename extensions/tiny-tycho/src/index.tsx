import { useEffect, useState } from "react";
import { ActionPanel, Action, Grid } from "@raycast/api";

const items = [
  {
    content: "https://files.orangebyte.io/resources/stickers/01_Smile.png",
    keywords: ["proud", "smile", "cute", "kind", "happy", "friendly"],
  },
  {
    content: "https://files.orangebyte.io/resources/stickers/02_Wink.png",
    keywords: ["wink", "eye", "cute", "kind", "friendly"],
  },
  {
    content: "https://files.orangebyte.io/resources/stickers/03_Excited.png",
    keywords: ["excited", "wow", "yay", "nice", "amazed", "wonderful", "omg", "happy"],
  },
  {
    content: "https://files.orangebyte.io/resources/stickers/04_Laugh.png",
    keywords: ["laugh", "lol", "kek", "funny", "hahahaha", "meme", "happy"],
  },
  {
    content: "https://files.orangebyte.io/resources/stickers/05_Tongue.png",
    keywords: ["tongue", "lol", "kek", "funny", "hahahaha", "meme", "happy", "crazy", "weird"],
  },
  {
    content: "https://files.orangebyte.io/resources/stickers/06_Giggle.png",
    keywords: ["giggle", "hehehehe", "hahahaha", "laugh", "cute", "happy"],
  },
  {
    content: "https://files.orangebyte.io/resources/stickers/07_Blush.png",
    keywords: ["blush", "cute", "sweet", "shy", "hands", "cheeks", "happy"],
  },
  {
    content: "https://files.orangebyte.io/resources/stickers/08_Stare.png",
    keywords: ["stare", "smile", "empty", "dead", "eh", "kek", "nope"],
  },
  {
    content: "https://files.orangebyte.io/resources/stickers/09_Uncomfortable.png",
    keywords: ["uncomfortable", "uneasy", "nervous", "stressed"],
  },
  {
    content: "https://files.orangebyte.io/resources/stickers/10_Sad.png",
    keywords: ["sad", "tears", "crying", "cute"],
  },
  {
    content: "https://files.orangebyte.io/resources/stickers/11_Crying.png",
    keywords: ["sad", "tears", "crying", "poor"],
  },
  {
    content: "https://files.orangebyte.io/resources/stickers/12_Unamused.png",
    keywords: ["unamused", "not amused", "mad", "annoyed", "grrrr"],
  },
  {
    content: "https://files.orangebyte.io/resources/stickers/13_Mad.png",
    keywords: ["unamused", "not amused", "angry", "mad", "annoyed", "grrrr", "mean"],
  },
  {
    content: "https://files.orangebyte.io/resources/stickers/14_Wut.png",
    keywords: ["wut", "angry", "mad", "annoyed", "grrrr", "mean", "hands"],
  },
  {
    content: "https://files.orangebyte.io/resources/stickers/15_Loser.png",
    keywords: ["loser", "tongue", "funny", "mean", "nananana", "noob"],
  },
  {
    content: "https://files.orangebyte.io/resources/stickers/16_Knife.png",
    keywords: ["knife", "angry", "mad", "annoyed", "grrrr", "kill", "dead", "murder", "hurt", "mean"],
  },
  {
    content: "https://files.orangebyte.io/resources/stickers/17_Devil.png",
    keywords: ["evil", "angry", "mad", "annoyed", "grrrr", "devil", "mean"],
  },
  {
    content: "https://files.orangebyte.io/resources/stickers/18_Angel.png",
    keywords: ["angel", "innocent", "cute", "wings", "baby", "kind"],
  },
  {
    content: "https://files.orangebyte.io/resources/stickers/19_Cool.png",
    keywords: ["cool", "sunglasses", "style", "sunny", "summer"],
  },
  {
    content: "https://files.orangebyte.io/resources/stickers/20_Smart.png",
    keywords: ["smart", "thinking", "brains", "meme", "smerk", "hmmmm"],
  },
  {
    content: "https://files.orangebyte.io/resources/stickers/21_Dumb.png",
    keywords: ["dumb", "stupid", "brains", "no brains", "annoying", "drooling"],
  },
  {
    content: "https://files.orangebyte.io/resources/stickers/22_Smerk.png",
    keywords: ["smerk", "dirty", "smile", "sexy", "hey"],
  },
  {
    content: "https://files.orangebyte.io/resources/stickers/23_LipBite.png",
    keywords: ["lip bite", "dirty", "sexy", "chin"],
  },
  {
    content: "https://files.orangebyte.io/resources/stickers/24_Cringe.png",
    keywords: ["cringe", "ew", "bah", "no thanks", "nope"],
  },
  {
    content: "https://files.orangebyte.io/resources/stickers/25_RaisedEyebrow.png",
    keywords: ["raised eyebrow", "suspicous", "suspect", "hmmmm"],
  },
  {
    content: "https://files.orangebyte.io/resources/stickers/26_Suspicious.png",
    keywords: ["suspicous", "suspect", "hmmmm"],
  },
  {
    content: "https://files.orangebyte.io/resources/stickers/27_Waiting.png",
    keywords: ["waiting", "watch", "time", "late", "leaning", "slow", "long", "clock", "wall"],
  },
  {
    content: "https://files.orangebyte.io/resources/stickers/28_EyeRoll.png",
    keywords: ["eye roll", "sigh", "disappointed"],
  },
  {
    content: "https://files.orangebyte.io/resources/stickers/29_Eh.png",
    keywords: ["eh", "ew", "shocked", "dirty", "nasty", "nope"],
  },
  {
    content: "https://files.orangebyte.io/resources/stickers/30_FacePalm.png",
    keywords: ["face palm", "facepalm", "palm", "stupid", "disappointed", "dumb"],
  },
  {
    content: "https://files.orangebyte.io/resources/stickers/31_Shrug.png",
    keywords: ["shrug", "idk", "i dont know", "no idea", "idc", "i dont care", "ok"],
  },
  {
    content: "https://files.orangebyte.io/resources/stickers/32_Wave.png",
    keywords: [
      "wave",
      "hi",
      "hello",
      "hey",
      "bonjour",
      "welcome",
      "bye",
      "goodbye",
      "see ya",
      "see you",
      "later",
      "going",
      "coming",
    ],
  },
  {
    content: "https://files.orangebyte.io/resources/stickers/33_Pat.png",
    keywords: [
      "pat pat",
      "pating",
      "patting",
      "hand",
      "like",
      "awwww",
      "aaaawwww",
      "nawwww",
      "naaaawwww",
      "nahwwww",
      "naaaahwwww",
      "cute",
      "sweet",
      "nice",
      "kind",
      "friend",
      "pet",
      "love",
    ],
  },
  {
    content: "https://files.orangebyte.io/resources/stickers/34_Hug.png",
    keywords: [
      "hugging",
      "huging",
      "love",
      "hand",
      "like",
      "awwww",
      "aaaawwww",
      "nawwww",
      "naaaawwww",
      "nahwwww",
      "naaaahwwww",
      "cute",
      "sweet",
      "nice",
      "kind",
      "embrace",
      "froggy",
      "froggie",
      "frogy",
      "frogie",
      "friend",
    ],
  },
  {
    content: "https://files.orangebyte.io/resources/stickers/35_Heart.png",
    keywords: [
      "heart",
      "love",
      "friend",
      "hand",
      "like",
      "awwww",
      "aaaawwww",
      "nawwww",
      "naaaawwww",
      "nahwwww",
      "naaaahwwww",
      "cute",
      "sweet",
      "nice",
      "kind",
    ],
  },
  {
    content: "https://files.orangebyte.io/resources/stickers/36_BlowKiss.png",
    keywords: [
      "kissing",
      "blow kissing",
      "love",
      "hand",
      "like",
      "awwww",
      "aaaawwww",
      "nawwww",
      "naaaawwww",
      "nahwwww",
      "naaaahwwww",
      "cute",
      "sweet",
      "nice",
      "kind",
      "friend",
      "sarcastic",
    ],
  },
  {
    content: "https://files.orangebyte.io/resources/stickers/37_HeartHands.png",
    keywords: [
      "heart",
      "heart hands",
      "love",
      "friend",
      "hand",
      "like",
      "awwww",
      "aaaawwww",
      "nawwww",
      "naaaawwww",
      "nahwwww",
      "naaaahwwww",
      "cute",
      "sweet",
      "nice",
      "kind",
    ],
  },
  {
    content: "https://files.orangebyte.io/resources/stickers/38_Clapping.png",
    keywords: ["clapping", "applauce", "well done", "good", "nice", "proud", "like"],
  },
  {
    content: "https://files.orangebyte.io/resources/stickers/39_Nod.png",
    keywords: ["nodding", "yes", "correct", "yup", "good", "agreed", "agreeing"],
  },
  {
    content: "https://files.orangebyte.io/resources/stickers/40_ThumbsUp.png",
    keywords: ["thumbs up", "yes", "correct", "yup", "good", "agreed", "agreeing", "like"],
  },
  {
    content: "https://files.orangebyte.io/resources/stickers/41_Boo.png",
    keywords: ["boo", "thumbs down", "nope", "disagree", "dislike", "bad", "mad", "angry"],
  },
  {
    content: "https://files.orangebyte.io/resources/stickers/42_Bored.png",
    keywords: ["bored", "sad", "boring", "nothing to do", "leaning"],
  },
  {
    content: "https://files.orangebyte.io/resources/stickers/43_Sleepy.png",
    keywords: ["sleepy", "tired", "sleep", "sleeping", "bored", "boring", "nothing to do"],
  },
  {
    content: "https://files.orangebyte.io/resources/stickers/44_Pinch.png",
    keywords: ["pinch", "small", "tiny", "little", "a bit", "a little bit", "just a bit", "just a little bit", "pp"],
  },
  {
    content: "https://files.orangebyte.io/resources/stickers/45_Shush.png",
    keywords: [
      "shush",
      "shushing",
      "ssh",
      "sssh",
      "shh",
      "shhh",
      "sshh",
      "ssshhh",
      "quiet",
      "silence",
      "silent",
      "no talking",
      "mouth shut",
    ],
  },
  {
    content: "https://files.orangebyte.io/resources/stickers/46_Praying.png",
    keywords: ["praying", "pleading", "please", "god", "hope", "hoping", "wanting"],
  },
  {
    content: "https://files.orangebyte.io/resources/stickers/47_Stressed.png",
    keywords: ["stressed", "messed up", "fucked up", "missed", "wrong", "scared", "afraid", "oh no"],
  },
  {
    content: "https://files.orangebyte.io/resources/stickers/48_Insane.png",
    keywords: [
      "insane",
      "scary",
      "out of mind",
      "weird",
      "stressed",
      "messed up",
      "fucked up",
      "missed",
      "wrong",
      "scared",
      "afraid",
      "oh no",
    ],
  },
  {
    content: "https://files.orangebyte.io/resources/stickers/49_Sweat.png",
    keywords: ["sweat", "gamer", "pro", "warm", "sweating", "gaming", "winning"],
  },
  {
    content: "https://files.orangebyte.io/resources/stickers/50_Phew.png",
    keywords: ["phew", "close call", "almost", "missed", "scared", "just"],
  },
  {
    content: "https://files.orangebyte.io/resources/stickers/51_LookingAway.png",
    keywords: [
      "looking away",
      "monkey puppet",
      "pupper",
      "i know nothing",
      "idk",
      "i dont know",
      "not me",
      "look away",
      "meme",
    ],
  },
  {
    content: "https://files.orangebyte.io/resources/stickers/52_Shocked.png",
    keywords: ["shocked", "amazed", "wow", "what", "really", "hands", "mouth", "omg"],
  },
  {
    content: "https://files.orangebyte.io/resources/stickers/53_MindBlown.png",
    keywords: [
      "mind blown",
      "shocked",
      "amazed",
      "wow",
      "what",
      "really",
      "hands",
      "mouth",
      "omg",
      "boom",
      "brain explode",
      "explode",
    ],
  },
  {
    content: "https://files.orangebyte.io/resources/stickers/54_What.png",
    keywords: ["what", "shocked", "big eyes", "lost for words", "scared", "oh no", "wtf"],
  },
  {
    content: "https://files.orangebyte.io/resources/stickers/55_Loading.png",
    keywords: ["loading", "what", "amazed", "shocked", "uhmmmm", "uuuuhmmmm", "confused", "confusing", "meme"],
  },
  {
    content: "https://files.orangebyte.io/resources/stickers/56_Confused.png",
    keywords: ["confused", "huh", "what", "why", "question mark"],
  },
  {
    content: "https://files.orangebyte.io/resources/stickers/57_Hot.png",
    keywords: ["hot", "warm", "sweat", "sunny", "summer", "burning", "red"],
  },
  {
    content: "https://files.orangebyte.io/resources/stickers/58_Cold.png",
    keywords: ["cold", "freezing", "winter", "snowing", "ice", "brrrr", "blue"],
  },
  {
    content: "https://files.orangebyte.io/resources/stickers/59_Drooling.png",
    keywords: ["drooling", "hungry", "food", "yummy", "delicious", "wow", "good", "dinner", "eating", "lucnh"],
  },
  {
    content: "https://files.orangebyte.io/resources/stickers/60_ChefsKiss.png",
    keywords: [
      "chefs kiss",
      "kissing",
      "food",
      "yummy",
      "delicious",
      "master piece",
      "nice",
      "just right",
      "perfect",
      "wow",
      "good",
      "kitchen",
      "dinner",
      "eating",
      "lucnh",
    ],
  },
  {
    content: "https://files.orangebyte.io/resources/stickers/61_Popcorn.png",
    keywords: [
      "popcorn",
      "food",
      "snack",
      "eating",
      "dinner",
      "lucnh",
      "movie",
      "interesting",
      "tea",
      "drama",
      "watching",
    ],
  },
  {
    content: "https://files.orangebyte.io/resources/stickers/62_Munching.png",
    keywords: [
      "munching",
      "food",
      "snack",
      "eating",
      "dinner",
      "lucnh",
      "orange",
      "munch",
      "orangebyte",
      "tycho",
      "omnom",
    ],
  },
  {
    content: "https://files.orangebyte.io/resources/stickers/63_Sip.png",
    keywords: ["sipping", "drinking", "tea", "drama", "chilling", "basic", "cute", "nice", "okay"],
  },
  {
    content: "https://files.orangebyte.io/resources/stickers/64_Puke.png",
    keywords: ["puke", "ew", "green", "throwing up", "disgusting", "yuck", "nasty", "bad", "food"],
  },
  {
    content: "https://files.orangebyte.io/resources/stickers/65_Chaos.png",
    keywords: ["chaos", "elmo", "fire", "distruction", "evil", "hahahaha", "hell", "meme"],
  },
  {
    content: "https://files.orangebyte.io/resources/stickers/66_Imagination.png",
    keywords: [
      "imagination",
      "sponge bob squarepants",
      "squarepants",
      "rainbow",
      "wow",
      "special",
      "murder",
      "ooooh",
      "oh",
      "ooh",
      "oooh",
      "meme",
    ],
  },
  {
    content: "https://files.orangebyte.io/resources/stickers/67_Clown.png",
    keywords: [
      "clown",
      "funny",
      "joking",
      "joke",
      "red nose",
      "nose",
      "circus",
      "smile",
      "laugh",
      "sarcastic",
      "hahahaha",
    ],
  },
  {
    content: "https://files.orangebyte.io/resources/stickers/68_Party.png",
    keywords: [
      "party",
      "party popper",
      "party hat",
      "hat",
      "confetti",
      "birthday",
      "winner",
      "good job",
      "nice",
      "yay",
    ],
  },
  {
    content: "https://files.orangebyte.io/resources/stickers/69_Crown.png",
    keywords: [
      "winner",
      "gamer",
      "crown",
      "king",
      "queen",
      "fall guys",
      "beans",
      "prince",
      "princess",
      "victory",
      "final",
      "sweat",
    ],
  },
  {
    content: "https://files.orangebyte.io/resources/stickers/70_Gaming.png",
    keywords: [
      "gaming",
      "gamer",
      "controller",
      "player",
      "playing",
      "console",
      "xbox",
      "playstation",
      "nintendo",
      "switch",
      "sony",
      "microsoft",
      "sweat",
      "concentration",
      "nerd",
    ],
  },
  {
    content: "https://files.orangebyte.io/resources/stickers/71_Vibing.png",
    keywords: ["vibing", "music", "listening to music", "headphones", "earphones", "airpods", "chilling", "relaxing"],
  },
  {
    content: "https://files.orangebyte.io/resources/stickers/72_Laptop.png",
    keywords: [
      "laptop",
      "pc",
      "macbook",
      "computer",
      "nerd",
      "code",
      "coding",
      "gaming",
      "gamer",
      "windows",
      "macos",
      "working",
    ],
  },
  {
    content: "https://files.orangebyte.io/resources/stickers/B01_Banner_This.png",
    keywords: ["banner", "banner this", "banner same", "this"],
  },
  {
    content: "https://files.orangebyte.io/resources/stickers/B02_Banner_Hello.png",
    keywords: ["banner", "banner hello", "hello"],
  },
  {
    content: "https://files.orangebyte.io/resources/stickers/B03_Banner_Bye.png",
    keywords: ["banner", "banner bye", "bye"],
  },
  {
    content: "https://files.orangebyte.io/resources/stickers/B04_Banner_Yes.png",
    keywords: ["banner", "banner yes", "banner agreeing", "banner agreed", "yes"],
  },
  {
    content: "https://files.orangebyte.io/resources/stickers/B05_Banner_No.png",
    keywords: ["banner", "banner nope", "banner deny", "no"],
  },
  {
    content: "https://files.orangebyte.io/resources/stickers/B06_Banner_Maybe.png",
    keywords: ["banner", "banner maybe", "maybe"],
  },
  {
    content: "https://files.orangebyte.io/resources/stickers/B07_Banner_Ok.png",
    keywords: ["banner", "banner ok", "ok"],
  },
  {
    content: "https://files.orangebyte.io/resources/stickers/B08_Banner_Please.png",
    keywords: ["banner", "banner please", "please"],
  },
  {
    content: "https://files.orangebyte.io/resources/stickers/B09_Banner_Thanks.png",
    keywords: ["banner", "banner thanks", "thanks"],
  },
  {
    content: "https://files.orangebyte.io/resources/stickers/B10_Banner_What.png",
    keywords: ["banner", "banner what", "banner question", "what"],
  },
  {
    content: "https://files.orangebyte.io/resources/stickers/B11_Banner_Why.png",
    keywords: ["banner", "banner why", "banner question", "why"],
  },
  {
    content: "https://files.orangebyte.io/resources/stickers/B12_Banner_How.png",
    keywords: ["banner", "banner how", "banner question", "how"],
  },
  {
    content: "https://files.orangebyte.io/resources/stickers/B13_Banner_Doubt.png",
    keywords: ["banner", "banner doubt", "banner meme", "doubt"],
  },
  {
    content: "https://files.orangebyte.io/resources/stickers/B14_Banner_ShowMe.png",
    keywords: ["banner", "banner show me", "banner show", "show me", "show"],
  },
  {
    content: "https://files.orangebyte.io/resources/stickers/B15_Banner_BonAppetit.png",
    keywords: ["banner", "banner bon appetit", "bon appetit"],
  },
  {
    content: "https://files.orangebyte.io/resources/stickers/B16_Banner_Same.png",
    keywords: ["banner", "banner same", "same"],
  },
  {
    content: "https://files.orangebyte.io/resources/stickers/B17_Banner_Cute.png",
    keywords: ["banner", "banner cute", "cute"],
  },
  {
    content: "https://files.orangebyte.io/resources/stickers/B18_Banner_NoU.png",
    keywords: ["banner", "banner no u", "banner no you", "no u", "no you"],
  },
  {
    content: "https://files.orangebyte.io/resources/stickers/B19_Banner_UhOh.png",
    keywords: ["banner", "banner uh-oh", "banner uh oh", "uh-oh", "uh oh"],
  },
  {
    content: "https://files.orangebyte.io/resources/stickers/B20_Banner_GoodLuck.png",
    keywords: ["banner", "banner good luck", "banner luck", "good luck", "luck"],
  },
  {
    content: "https://files.orangebyte.io/resources/stickers/B21_Banner_GG.png",
    keywords: ["banner", "banner gg", "banner good game", "banner winner", "banner gaming", "banner gamer", "gg"],
  },
  {
    content: "https://files.orangebyte.io/resources/stickers/B22_Banner_SkillIssue.png",
    keywords: [
      "banner",
      "banner skill issue",
      "banner gaming",
      "banner noob",
      "banner gamer",
      "banner donny",
      "skill issue",
    ],
  },
  {
    content: "https://files.orangebyte.io/resources/stickers/B23_Banner_Bug.png",
    keywords: ["banner", "banner bug", "banner issue", "banner error", "bug"],
  },
  {
    content: "https://files.orangebyte.io/resources/stickers/B24_Banner_Ban.png",
    keywords: ["banner", "banner ban", "banner kick", "banner warn", "ban"],
  },
  {
    content: "https://files.orangebyte.io/resources/stickers/F01_Flag_NL.png",
    keywords: [
      "flag",
      "flag nl",
      "flag dutch",
      "flag netherlands",
      "flag the netherlands",
      "flag nederland",
      "flag red white blue",
      "flag europe",
      "flag european union",
      "flag amsterdam",
    ],
  },
  {
    content: "https://files.orangebyte.io/resources/stickers/F02_Flag_UK.png",
    keywords: [
      "flag",
      "flag uk",
      "flag united kingdom",
      "flag england",
      "flag britain",
      "flag union jack",
      "flag europe",
      "flag london",
      "flag brexit",
      "flag island",
      "flag english",
    ],
  },
  {
    content: "https://files.orangebyte.io/resources/stickers/F03_Flag_US.png",
    keywords: [
      "flag",
      "flag us",
      "flag united states of america",
      "flag america",
      "flag eagle",
      "flag north america",
      "flag new york",
      "flag ny",
      "flag la",
      "flag los angelas",
      "flag washington dc",
      "flag president",
      "flag english",
    ],
  },
  {
    content: "https://files.orangebyte.io/resources/stickers/F04_Flag_JP.png",
    keywords: ["flag", "flag jp", "flag japan", "flag anime", "flag asia", "flag tokyo"],
  },
  {
    content: "https://files.orangebyte.io/resources/stickers/F05_Flag_DE.png",
    keywords: [
      "flag",
      "flag de",
      "flag germany",
      "flag deutchland",
      "flag europe",
      "flag european union",
      "flag berlin",
    ],
  },
  {
    content: "https://files.orangebyte.io/resources/stickers/F06_Flag_BE.png",
    keywords: [
      "flag",
      "flag be",
      "flag belgium",
      "flag belgie",
      "flag belgique",
      "flag europe",
      "flag friet",
      "flag european union",
      "flag flaams",
      "flag flaanderen",
      "flag flemish",
      "flag brussels",
      "flag antwerp",
      "flag belgian",
    ],
  },
  {
    content: "https://files.orangebyte.io/resources/stickers/F07_Flag_FR.png",
    keywords: [
      "flag",
      "flag fr",
      "flag french",
      "flag france",
      "flag francais",
      "flag paris",
      "flag eiffel tower",
      "flag europe",
      "flag european union",
    ],
  },
  {
    content: "https://files.orangebyte.io/resources/stickers/F08_Flag_ES.png",
    keywords: [
      "flag",
      "flag es",
      "flag spain",
      "flag spanish",
      "flag europe",
      "flag european union",
      "flag madrid",
      "flag barcelona",
    ],
  },
  {
    content: "https://files.orangebyte.io/resources/stickers/F09_Flag_EU.png",
    keywords: ["flag", "flag europe", "flag european union"],
  },
  {
    content: "https://files.orangebyte.io/resources/stickers/F10_Flag_Finish.png",
    keywords: [
      "flag",
      "flag finish line",
      "flag race",
      "flag winner",
      "flag f1",
      "flag formula 1",
      "flag formula one",
      "flag nascar",
      "flag black white",
      "flag white black",
      "flag blocks",
    ],
  },
  {
    content: "https://files.orangebyte.io/resources/stickers/F11_Flag_White.png",
    keywords: ["flag", "flag white", "flag surender", "flag loser", "flag give up"],
  },
  {
    content: "https://files.orangebyte.io/resources/stickers/F12_Flag_Red.png",
    keywords: ["flag", "flag red", "red flag", "flag nope", "flag disappointed", "flag cancel", "flag stop"],
  },
];

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const [filteredList, filterList] = useState(items);

  useEffect(() => {
    filterList(items.filter((item) => item.keywords.some((keyword) => keyword.includes(searchText))));
  }, [searchText]);

  return (
    <Grid
      columns={6}
      inset={Grid.Inset.Small}
      filtering={false}
      onSearchTextChange={setSearchText}
      navigationTitle="Tiny Tycho"
      searchBarPlaceholder="Search Stickers"
    >
      {filteredList.map((item) => (
        <Grid.Item
          key={item.content}
          content={item.content}
          actions={
            <ActionPanel>
              <Action.Paste content={item.content} />
              <Action.CopyToClipboard content={item.content} />
              <Action.OpenInBrowser url={item.content} />
            </ActionPanel>
          }
        />
      ))}
    </Grid>
  );
}
