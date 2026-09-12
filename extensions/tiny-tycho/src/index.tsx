import { useEffect, useState } from "react";
import { ActionPanel, Action, Grid } from "@raycast/api";

const items = [
  {
    content: "https://files.orangebyte.io/stickers/001_Smile.png",
    keywords: ["proud", "smile", "cute", "kind", "happy", "friendly", "friendly"],
  },
  {
    content: "https://files.orangebyte.io/stickers/002_Excited.png",
    keywords: ["excited", "wow", "yay", "nice", "amazed", "wonderful", "omg", "happy"],
  },
  {
    content: "https://files.orangebyte.io/stickers/003_Laugh.png",
    keywords: ["laugh", "lol", "kek", "funny", "hahahaha", "meme", "happy"],
  },
  {
    content: "https://files.orangebyte.io/stickers/004_Wink.png",
    keywords: ["wink", "eye", "cute", "kind", "friendly"],
  },
  {
    content: "https://files.orangebyte.io/stickers/005_Tongue.png",
    keywords: ["tongue", "lol", "kek", "funny", "hahahaha", "meme", "happy", "crazy", "weird", "bleh"],
  },
  {
    content: "https://files.orangebyte.io/stickers/006_Bleh.png",
    keywords: ["tongue", "lol", "kek", "funny", "hahahaha", "meme", "happy", "crazy", "weird", "bleh"],
  },
  {
    content: "https://files.orangebyte.io/stickers/007_Loser.png",
    keywords: ["loser", "tongue", "funny", "mean", "nananana", "noob"],
  },
  {
    content: "https://files.orangebyte.io/stickers/008_Giggle.png",
    keywords: ["giggle", "hehehehe", "hahahaha", "laugh", "cute", "happy"],
  },
  {
    content: "https://files.orangebyte.io/stickers/009_Blush.png",
    keywords: ["blush", "cute", "sweet", "shy", "hands", "cheeks", "happy"],
  },
  {
    content: "https://files.orangebyte.io/stickers/010_Shy.png",
    keywords: ["blush", "cute", "sweet", "shy", "hands", "cheeks", "happy", "uwu"],
  },
  {
    content: "https://files.orangebyte.io/stickers/011_Embarrassed.png",
    keywords: ["blush", "cute", "sweet", "shy", "hands", "cheeks", "happy", "embarrassed"],
  },
  {
    content: "https://files.orangebyte.io/stickers/012_Flower.png",
    keywords: ["blush", "cute", "sweet", "shy", "flower", "cheeks", "happy", "gift", "nature"],
  },
  {
    content: "https://files.orangebyte.io/stickers/013_HappyTears.png",
    keywords: ["happy", "tears", "emotional", "flabbergasted", "cute", "smile"],
  },
  {
    content: "https://files.orangebyte.io/stickers/014_Uncomfortable.png",
    keywords: ["uncomfortable", "uneasy", "nervous", "stressed"],
  },
  {
    content: "https://files.orangebyte.io/stickers/015_FakeSmile.png",
    keywords: [
      "uncomfortable",
      "uneasy",
      "nervous",
      "stressed",
      "smile",
      "fake",
      "unhappy",
      "acting",
      "harold",
      "hide",
      "pain",
    ],
  },
  {
    content: "https://files.orangebyte.io/stickers/016_Stare.png",
    keywords: ["stare", "smile", "empty", "dead", "eh", "kek", "nope"],
  },
  {
    content: "https://files.orangebyte.io/stickers/017_Sad.png",
    keywords: ["sad", "tears", "crying", "cute"],
  },
  {
    content: "https://files.orangebyte.io/stickers/018_Crying.png",
    keywords: ["sad", "tears", "crying", "poor"],
  },
  {
    content: "https://files.orangebyte.io/stickers/019_Unamused.png",
    keywords: ["unamused", "not amused", "mad", "annoyed", "grrrr"],
  },
  {
    content: "https://files.orangebyte.io/stickers/020_Mad.png",
    keywords: ["unamused", "not amused", "angry", "mad", "annoyed", "grrrr", "mean"],
  },
  {
    content: "https://files.orangebyte.io/stickers/021_Wut.png",
    keywords: ["wut", "angry", "mad", "annoyed", "grrrr", "mean", "hands"],
  },
  {
    content: "https://files.orangebyte.io/stickers/022_Angry.png",
    keywords: ["angry", "mad", "annoyed", "grrrr", "mean"],
  },
  {
    content: "https://files.orangebyte.io/stickers/023_Knife.png",
    keywords: ["knife", "angry", "mad", "annoyed", "grrrr", "kill", "dead", "murder", "hurt", "mean"],
  },
  {
    content: "https://files.orangebyte.io/stickers/024_Bonk.png",
    keywords: [
      "bonk",
      "angry",
      "mad",
      "annoyed",
      "grrrr",
      "kill",
      "dead",
      "murder",
      "hurt",
      "mean",
      "hit",
      "baseball",
      "bat",
    ],
  },
  {
    content: "https://files.orangebyte.io/stickers/025_Cool.png",
    keywords: ["cool", "sunglasses", "style", "sunny", "summer"],
  },
  {
    content: "https://files.orangebyte.io/stickers/026_Smirk.png",
    keywords: ["smirk", "dirty", "smile", "sexy", "hey"],
  },
  {
    content: "https://files.orangebyte.io/stickers/027_LipBite.png",
    keywords: ["lip bite", "dirty", "sexy", "chin"],
  },
  {
    content: "https://files.orangebyte.io/stickers/028_Cringe.png",
    keywords: ["cringe", "ew", "bah", "no thanks", "nope"],
  },
  {
    content: "https://files.orangebyte.io/stickers/029_RaisedEyebrow.png",
    keywords: ["raised", "eyebrow", "suspicous", "suspect", "hmmmm"],
  },
  {
    content: "https://files.orangebyte.io/stickers/030_Investigating.png",
    keywords: ["investigate", "magnifying", "glass", "suspicous", "suspect"],
  },
  {
    content: "https://files.orangebyte.io/stickers/031_Suspicious.png",
    keywords: ["suspicous", "suspect", "hmmmm"],
  },
  {
    content: "https://files.orangebyte.io/stickers/032_LookingAway.png",
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
    content: "https://files.orangebyte.io/stickers/033_Smart.png",
    keywords: ["smart", "thinking", "brains", "meme", "smirk", "hmmmm"],
  },
  {
    content: "https://files.orangebyte.io/stickers/034_Nerd.png",
    keywords: ["smart", "thinking", "brains", "meme", "nerd", "hmmmm", "actually"],
  },
  {
    content: "https://files.orangebyte.io/stickers/035_Dumb.png",
    keywords: ["dumb", "stupid", "brains", "no brains", "annoying", "drooling"],
  },
  {
    content: "https://files.orangebyte.io/stickers/036_Surprised.png",
    keywords: ["shocked", "amazed", "wow", "what", "really", "hands", "mouth", "omg", "surprised"],
  },
  {
    content: "https://files.orangebyte.io/stickers/037_MindBlown.png",
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
    content: "https://files.orangebyte.io/stickers/038_Shocked.png",
    keywords: ["what", "shocked", "big eyes", "lost for words", "scared", "oh no", "wtf", "surpised"],
  },
  {
    content: "https://files.orangebyte.io/stickers/039_Loading.png",
    keywords: ["loading", "what", "amazed", "shocked", "uhmmmm", "uuuuhmmmm", "confused", "confusing", "meme"],
  },
  {
    content: "https://files.orangebyte.io/stickers/040_Confused.png",
    keywords: ["confused", "huh", "what", "why", "question mark"],
  },
  {
    content: "https://files.orangebyte.io/stickers/041_Insane.png",
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
    content: "https://files.orangebyte.io/stickers/042_Stressed.png",
    keywords: ["stressed", "messed up", "fucked up", "missed", "wrong", "scared", "afraid", "oh no"],
  },
  {
    content: "https://files.orangebyte.io/stickers/043_EyeRoll.png",
    keywords: ["eye roll", "sigh", "disappointed"],
  },
  {
    content: "https://files.orangebyte.io/stickers/044_FacePalm.png",
    keywords: ["face palm", "facepalm", "palm", "stupid", "disappointed", "dumb"],
  },
  {
    content: "https://files.orangebyte.io/stickers/045_Eh.png",
    keywords: ["eh", "ew", "shocked", "dirty", "nasty", "nope"],
  },
  {
    content: "https://files.orangebyte.io/stickers/046_Dizzy.png",
    keywords: ["eh", "dizzy", "fainted", "crazy"],
  },
  {
    content: "https://files.orangebyte.io/stickers/047_Dead.png",
    keywords: ["eh", "dead", "fainted", "died", "ghost", "rip"],
  },
  {
    content: "https://files.orangebyte.io/stickers/048_Sweat.png",
    keywords: ["sweat", "gamer", "pro", "warm", "sweating", "gaming", "winning"],
  },
  {
    content: "https://files.orangebyte.io/stickers/049_Wave.png",
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
    content: "https://files.orangebyte.io/stickers/050_Salute.png",
    keywords: ["salute", "hi", "hello", "hey", "bonjour", "slave", "yes", "sir", "boss"],
  },
  {
    content: "https://files.orangebyte.io/stickers/051_Pat.png",
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
    content: "https://files.orangebyte.io/stickers/052_Hug.png",
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
    content: "https://files.orangebyte.io/stickers/053_Kiss.png",
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
    content: "https://files.orangebyte.io/stickers/054_Heart.png",
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
    content: "https://files.orangebyte.io/stickers/055_HeartHands.png",
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
    content: "https://files.orangebyte.io/stickers/056_MiddleFinger.png",
    keywords: ["middle", "finger", "mad", "angry", "hand", "hate", "grrrr"],
  },
  {
    content: "https://files.orangebyte.io/stickers/057_Shush.png",
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
    content: "https://files.orangebyte.io/stickers/058_Shrug.png",
    keywords: ["shrug", "idk", "i dont know", "no idea", "idc", "i dont care", "ok"],
  },
  {
    content: "https://files.orangebyte.io/stickers/059_Praying.png",
    keywords: ["praying", "pleading", "please", "god", "hope", "hoping", "wanting"],
  },
  {
    content: "https://files.orangebyte.io/stickers/060_Clapping.png",
    keywords: ["clapping", "applauce", "well done", "good", "nice", "proud", "like"],
  },
  {
    content: "https://files.orangebyte.io/stickers/061_ThumbsUp.png",
    keywords: ["thumbs up", "yes", "correct", "yup", "good", "agreed", "agreeing", "like"],
  },
  {
    content: "https://files.orangebyte.io/stickers/062_Boo.png",
    keywords: ["boo", "thumbs down", "nope", "disagree", "dislike", "bad", "mad", "angry"],
  },
  {
    content: "https://files.orangebyte.io/stickers/063_Nod.png",
    keywords: ["nodding", "yes", "correct", "yup", "good", "agreed", "agreeing"],
  },
  {
    content: "https://files.orangebyte.io/stickers/064_Shake.png",
    keywords: ["shaking", "no", "incorrect", "wrong", "nope", "bad", "disagreed", "disagreeing"],
  },
  {
    content: "https://files.orangebyte.io/stickers/065_Stonks.png",
    keywords: ["stonks", "meme", "winnings", "money", "stocks", "gaining", "profit"],
  },
  {
    content: "https://files.orangebyte.io/stickers/066_NoStonks.png",
    keywords: ["no", "stonks", "meme", "losses", "money", "stocks", "losing", "profit"],
  },
  {
    content: "https://files.orangebyte.io/stickers/067_Pinch.png",
    keywords: ["pinch", "small", "tiny", "little", "a bit", "a little bit", "just a bit", "just a little bit", "pp"],
  },
  {
    content: "https://files.orangebyte.io/stickers/068_Waiting.png",
    keywords: ["waiting", "watch", "time", "late", "leaning", "slow", "long", "clock", "wall"],
  },
  {
    content: "https://files.orangebyte.io/stickers/069_Sigh.png",
    keywords: ["bored", "sad", "boring", "nothing to do", "sighing"],
  },
  {
    content: "https://files.orangebyte.io/stickers/070_Bored.png",
    keywords: ["bored", "sad", "boring", "nothing to do", "leaning"],
  },
  {
    content: "https://files.orangebyte.io/stickers/071_Yawn.png",
    keywords: ["sleepy", "tired", "sleep", "sleeping", "bored", "boring", "nothing to do", "yawning"],
  },
  {
    content: "https://files.orangebyte.io/stickers/072_Sleeping.png",
    keywords: ["sleepy", "tired", "sleep", "sleeping", "bored", "boring", "nothing to do"],
  },
  {
    content: "https://files.orangebyte.io/stickers/073_Drooling.png",
    keywords: ["drooling", "hungry", "food", "yummy", "delicious", "wow", "good", "dinner", "eating", "lucnh"],
  },
  {
    content: "https://files.orangebyte.io/stickers/074_ChefsKiss.png",
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
    content: "https://files.orangebyte.io/stickers/075_Sick.png",
    keywords: ["puke", "ew", "green", "throwing up", "disgusting", "yuck", "nasty", "bad", "food", "sick", "ill"],
  },
  {
    content: "https://files.orangebyte.io/stickers/076_Salty.png",
    keywords: ["salty", "food", "mean", "annoying", "cooking", "powder", "emptying"],
  },
  {
    content: "https://files.orangebyte.io/stickers/077_Popcorn.png",
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
    content: "https://files.orangebyte.io/stickers/078_Munching.png",
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
    content: "https://files.orangebyte.io/stickers/079_Sip.png",
    keywords: ["sipping", "drinking", "tea", "drama", "chilling", "basic", "cute", "nice", "okay", "juice"],
  },
  {
    content: "https://files.orangebyte.io/stickers/080_Tea.png",
    keywords: ["sipping", "drinking", "tea", "drama", "chilling", "basic", "cute", "nice", "okay", "juice", "gossip"],
  },
  {
    content: "https://files.orangebyte.io/stickers/081_Hot.png",
    keywords: ["hot", "warm", "sweat", "sunny", "summer", "burning", "red"],
  },
  {
    content: "https://files.orangebyte.io/stickers/082_Cold.png",
    keywords: ["cold", "freezing", "winter", "snowing", "ice", "brrrr", "blue"],
  },
  {
    content: "https://files.orangebyte.io/stickers/083_Imagination.png",
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
    content: "https://files.orangebyte.io/stickers/084_Chaos.png",
    keywords: ["chaos", "elmo", "fire", "distruction", "evil", "hahahaha", "hell", "meme"],
  },
  {
    content: "https://files.orangebyte.io/stickers/085_Angel.png",
    keywords: ["angel", "innocent", "cute", "wings", "baby", "kind"],
  },
  {
    content: "https://files.orangebyte.io/stickers/086_Devil.png",
    keywords: ["evil", "angry", "mad", "annoyed", "grrrr", "devil", "mean"],
  },
  {
    content: "https://files.orangebyte.io/stickers/087_Note.png",
    keywords: ["taking", "note", "noting", "writing", "uhu", "listening", "drawing"],
  },
  {
    content: "https://files.orangebyte.io/stickers/088_Party.png",
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
    content: "https://files.orangebyte.io/stickers/089_Clown.png",
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
    content: "https://files.orangebyte.io/stickers/090_UnoReverse.png",
    keywords: ["uno", "reverse", "no u", "no you", "card", "game", "playing", "nope", "no", "u", "you"],
  },
  {
    content: "https://files.orangebyte.io/stickers/091_Dice.png",
    keywords: ["dice", "board", "game", "playing"],
  },
  {
    content: "https://files.orangebyte.io/stickers/092_Crown.png",
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
    content: "https://files.orangebyte.io/stickers/093_Gaming.png",
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
    content: "https://files.orangebyte.io/stickers/094_Vibing.png",
    keywords: ["vibing", "music", "listening to music", "headphones", "earphones", "airpods", "chilling", "relaxing"],
  },
  {
    content: "https://files.orangebyte.io/stickers/095_Phone.png",
    keywords: [
      "phone",
      "smartphone",
      "iphone",
      "texting",
      "nerd",
      "sms",
      "imessage",
      "gaming",
      "gamer",
      "chatting",
      "ios",
      "android",
    ],
  },
  {
    content: "https://files.orangebyte.io/stickers/096_Laptop.png",
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
    content: "https://files.orangebyte.io/stickers/097_Banner_This.png",
    keywords: ["banner", "banner this", "banner same", "this"],
  },
  {
    content: "https://files.orangebyte.io/stickers/098_Banner_Hello.png",
    keywords: ["banner", "banner hello", "hello"],
  },
  {
    content: "https://files.orangebyte.io/stickers/099_Banner_Bye.png",
    keywords: ["banner", "banner bye", "bye"],
  },
  {
    content: "https://files.orangebyte.io/stickers/100_Banner_Yes.png",
    keywords: ["banner", "banner yes", "banner agreeing", "banner agreed", "yes"],
  },
  {
    content: "https://files.orangebyte.io/stickers/101_Banner_No.png",
    keywords: ["banner", "banner nope", "banner deny", "no"],
  },
  {
    content: "https://files.orangebyte.io/stickers/102_Banner_Maybe.png",
    keywords: ["banner", "banner maybe", "maybe"],
  },
  {
    content: "https://files.orangebyte.io/stickers/103_Banner_Ok.png",
    keywords: ["banner", "banner ok", "ok"],
  },
  {
    content: "https://files.orangebyte.io/stickers/104_Banner_Please.png",
    keywords: ["banner", "banner please", "please"],
  },
  {
    content: "https://files.orangebyte.io/stickers/105_Banner_Thanks.png",
    keywords: ["banner", "banner thanks", "thanks"],
  },
  {
    content: "https://files.orangebyte.io/stickers/106_Banner_What.png",
    keywords: ["banner", "banner what", "banner question", "what"],
  },
  {
    content: "https://files.orangebyte.io/stickers/107_Banner_Why.png",
    keywords: ["banner", "banner why", "banner question", "why"],
  },
  {
    content: "https://files.orangebyte.io/stickers/108_Banner_How.png",
    keywords: ["banner", "banner how", "banner question", "how"],
  },
  {
    content: "https://files.orangebyte.io/stickers/109_Banner_Doubt.png",
    keywords: ["banner", "banner doubt", "banner meme", "doubt"],
  },
  {
    content: "https://files.orangebyte.io/stickers/110_Banner_ShowMe.png",
    keywords: ["banner", "banner show me", "banner show", "show me", "show"],
  },
  {
    content: "https://files.orangebyte.io/stickers/111_Banner_BonAppetit.png",
    keywords: ["banner", "banner bon appetit", "bon appetit"],
  },
  {
    content: "https://files.orangebyte.io/stickers/112_Banner_Same.png",
    keywords: ["banner", "banner same", "same"],
  },
  {
    content: "https://files.orangebyte.io/stickers/113_Banner_Cute.png",
    keywords: ["banner", "banner cute", "cute"],
  },
  {
    content: "https://files.orangebyte.io/stickers/114_Banner_NoU.png",
    keywords: ["banner", "banner no u", "banner no you", "no u", "no you"],
  },
  {
    content: "https://files.orangebyte.io/stickers/115_Banner_UhOh.png",
    keywords: ["banner", "banner uh-oh", "banner uh oh", "uh-oh", "uh oh"],
  },
  {
    content: "https://files.orangebyte.io/stickers/116_Banner_GoodLuck.png",
    keywords: ["banner", "banner good luck", "banner luck", "good luck", "luck"],
  },
  {
    content: "https://files.orangebyte.io/stickers/117_Banner_GG.png",
    keywords: ["banner", "banner gg", "banner good game", "banner winner", "banner gaming", "banner gamer", "gg"],
  },
  {
    content: "https://files.orangebyte.io/stickers/118_Banner_SkillIssue.png",
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
    content: "https://files.orangebyte.io/stickers/119_Banner_Bug.png",
    keywords: ["banner", "banner bug", "banner issue", "banner error", "bug"],
  },
  {
    content: "https://files.orangebyte.io/stickers/120_Banner_Ban.png",
    keywords: ["banner", "banner ban", "banner kick", "banner warn", "ban"],
  },
  {
    content: "https://files.orangebyte.io/stickers/121_Flag_NL.png",
    keywords: [
      "flag",
      "nl",
      "dutch",
      "netherlands",
      "the netherlands",
      "nederland",
      "red white blue",
      "europe",
      "european union",
      "amsterdam",
    ],
  },
  {
    content: "https://files.orangebyte.io/stickers/122_Flag_UK.png",
    keywords: [
      "flag",
      "uk",
      "united kingdom",
      "england",
      "britain",
      "union jack",
      "europe",
      "london",
      "brexit",
      "island",
      "english",
    ],
  },
  {
    content: "https://files.orangebyte.io/stickers/123_Flag_US.png",
    keywords: [
      "flag",
      "us",
      "united states of america",
      "america",
      "eagle",
      "north america",
      "new york",
      "ny",
      "la",
      "los angelas",
      "washington dc",
      "president",
      "english",
    ],
  },
  {
    content: "https://files.orangebyte.io/stickers/124_Flag_CA.png",
    keywords: [
      "flag",
      "ca",
      "canada",
      "america",
      "maple",
      "leaf",
      "north america",
      "toronto",
      "montreal",
      "vancouver",
      "otawa",
      "english",
    ],
  },
  {
    content: "https://files.orangebyte.io/stickers/125_Flag_JP.png",
    keywords: ["flag", "jp", "japan", "anime", "asia", "tokyo"],
  },
  {
    content: "https://files.orangebyte.io/stickers/126_Flag_BE.png",
    keywords: [
      "flag",
      "be",
      "belgium",
      "belgie",
      "belgique",
      "europe",
      "friet",
      "european union",
      "flaams",
      "flaanderen",
      "flemish",
      "brussels",
      "antwerp",
      "belgian",
    ],
  },
  {
    content: "https://files.orangebyte.io/stickers/127_Flag_FR.png",
    keywords: ["flag", "fr", "french", "france", "francais", "paris", "eiffel tower", "europe", "european union"],
  },
  {
    content: "https://files.orangebyte.io/stickers/128_Flag_ES.png",
    keywords: ["flag", "es", "spain", "spanish", "europe", "european union", "madrid", "barcelona"],
  },
  {
    content: "https://files.orangebyte.io/stickers/129_Flag_PT.png",
    keywords: ["flag", "pt", "portugal", "portugese", "europe", "european union", "lisbon"],
  },
  {
    content: "https://files.orangebyte.io/stickers/130_Flag_DE.png",
    keywords: ["flag", "de", "germany", "deutchland", "europe", "european union", "berlin"],
  },
  {
    content: "https://files.orangebyte.io/stickers/131_Flag_AT.png",
    keywords: ["flag", "at", "austria", "german", "europe", "european union", "vienna"],
  },
  {
    content: "https://files.orangebyte.io/stickers/132_Flag_SZ.png",
    keywords: ["flag", "sz", "switzerland", "europe", "european union", "bern"],
  },
  {
    content: "https://files.orangebyte.io/stickers/133_Flag_IT.png",
    keywords: ["flag", "it", "italy", "italian", "europe", "european union", "rome", "venice", "pisa"],
  },
  {
    content: "https://files.orangebyte.io/stickers/134_Flag_DK.png",
    keywords: ["flag", "dk", "denmark", "europe", "european union", "copenhagen"],
  },
  {
    content: "https://files.orangebyte.io/stickers/135_Flag_IE.png",
    keywords: ["flag", "ie", "ireland", "english", "europe", "european union", "dublin"],
  },
  {
    content: "https://files.orangebyte.io/stickers/136_Flag_EU.png",
    keywords: ["flag", "europe", "european union"],
  },
  {
    content: "https://files.orangebyte.io/stickers/137_Flag_RU.png",
    keywords: ["flag", "ru", "rusia", "moscow"],
  },
  {
    content: "https://files.orangebyte.io/stickers/138_Flag_CN.png",
    keywords: ["flag", "cn", "china", "asia", "hong kong"],
  },
  {
    content: "https://files.orangebyte.io/stickers/139_Flag_KR.png",
    keywords: ["flag", "kr", "south", "asia", "seoul"],
  },
  {
    content: "https://files.orangebyte.io/stickers/140_Flag_IN.png",
    keywords: ["flag", "in", "india", "asia", "new delhi"],
  },
  {
    content: "https://files.orangebyte.io/stickers/141_Flag_Rainbow.png",
    keywords: ["flag", "rainbow", "pride", "colors", "colorful", "colours", "colourful"],
  },
  {
    content: "https://files.orangebyte.io/stickers/142_Flag_Finish.png",
    keywords: [
      "flag",
      "finish line",
      "race",
      "winner",
      "f1",
      "formula 1",
      "formula one",
      "nascar",
      "black white",
      "white black",
      "blocks",
    ],
  },
  {
    content: "https://files.orangebyte.io/stickers/143_Flag_White.png",
    keywords: ["flag", "white", "surender", "loser", "give up"],
  },
  {
    content: "https://files.orangebyte.io/stickers/144_Flag_Red.png",
    keywords: ["flag", "red", "red flag", "nope", "disappointed", "cancel", "stop"],
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
