const bluePillQuotes = [
  "the simulation welcomes you back 💊",
  "comfort restored reality can wait 🛌",
  "dream protocol resumed 💤",
  "ignorance is looking pretty cozy 🫧",
  "the construct is humming again 🖥️",
  "another layer of green rain 🟩",
  "sleep tight chosen one 😴",
  "the system has you 🔒",
  "the dream continues 🌙",
  "nothing to see here 🕶️",
  "the system feels normal again ✅",
  "back into the soft lie 🛋️",
  "memory reset complete 🧠",
  "the illusion holds 🪞",
  "reality postponed ⏳",
  "comfort has been restored 🫖",
  "the construct remains intact 🧱",
  "sleep mode resumed 🛏️",
  "the walls are friendly again 🏙️",
  "your pod is warm 🟢",
  "the code keeps singing 🎼",
  "routine has been reloaded 🔁",
  "the glitch has been dismissed ✨",
  "ordinary life resumes ☕",
];

const redPillQuotes = [
  "you are beginning to believe 🕶️",
  "the construct is losing its grip 🧩",
  "reality has entered the chat 📟",
  "signal found exit line open 📡",
  "the code is falling away 🟩",
  "there is no spoon 🥄",
  "wake sequence initiated ⏰",
  "the illusion blinks first 👁️",
  "no more comfortable lies 🔴",
  "follow the white rabbit 🐇",
  "free your mind 🧠",
  "wake up ⏳",
  "welcome to the real world 🌍",
  "i know kung fu 🥋",
  "the dream is over 🌅",
  "the signal is getting clearer 📶",
  "the mirror is starting to crack 🪞",
  "the exit is closer than you think 🚪",
  "the machine cannot keep you ⚙️",
  "the veil is thinning 🧵",
  "truth has teeth 🦷",
  "the plug is coming loose 🔌",
  "the agents are nervous 👔",
  "the door is already open 🗝️",
];

export function getBluePillQuote(alreadyRunning: boolean): string {
  if (alreadyRunning) {
    return "the simulation is already running 🟢";
  }

  return choose(bluePillQuotes);
}

export function getRedPillQuote(): string {
  return choose(redPillQuotes);
}

function choose(quotes: string[]): string {
  return quotes[Math.floor(Math.random() * quotes.length)];
}
