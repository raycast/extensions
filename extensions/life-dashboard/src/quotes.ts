export interface Quote {
  text: string;
  author: string;
}

// Short, widely-quoted lines on time and living — attributed.
export const QUOTES: Quote[] = [
  { text: "It is not that we have a short time to live, but that we waste a lot of it.", author: "Seneca" },
  {
    text: "You could leave life right now. Let that determine what you do and say and think.",
    author: "Marcus Aurelius",
  },
  { text: "Waste no more time arguing about what a good man should be. Be one.", author: "Marcus Aurelius" },
  { text: "Time is the coin of your life. Only you can determine how it will be spent.", author: "Carl Sandburg" },
  { text: "How we spend our days is, of course, how we spend our lives.", author: "Annie Dillard" },
  { text: "Lost time is never found again.", author: "Benjamin Franklin" },
  { text: "The trouble is, you think you have time.", author: "attributed to Buddha" },
  { text: "Your time is limited, so don't waste it living someone else's life.", author: "Steve Jobs" },
  { text: "Life is what happens when you're busy making other plans.", author: "John Lennon" },
  { text: "We are always getting ready to live but never living.", author: "Ralph Waldo Emerson" },
  {
    text: "In the end, it's not the years in your life that count. It's the life in your years.",
    author: "attributed to Abraham Lincoln",
  },
  { text: "Do not squander time, for that is the stuff life is made of.", author: "Benjamin Franklin" },
  { text: "A man who dares to waste one hour of time has not discovered the value of life.", author: "Charles Darwin" },
  { text: "Every man dies. Not every man really lives.", author: "William Wallace (Braveheart)" },
  { text: "It's not the days in your life, but the life in your days.", author: "proverb" },
  { text: "Yesterday is gone. Tomorrow has not yet come. We have only today.", author: "Mother Teresa" },
  { text: "The two most powerful warriors are patience and time.", author: "Leo Tolstoy" },
  { text: "Time flies over us, but leaves its shadow behind.", author: "Nathaniel Hawthorne" },
  {
    text: "They always say time changes things, but you actually have to change them yourself.",
    author: "Andy Warhol",
  },
  {
    text: "The future is something which everyone reaches at the rate of sixty minutes an hour.",
    author: "C. S. Lewis",
  },
  { text: "Don't count the days; make the days count.", author: "Muhammad Ali" },
  { text: "Time you enjoy wasting is not wasted time.", author: "Marthe Troly-Curtin" },
  { text: "Begin at once to live, and count each separate day as a separate life.", author: "Seneca" },
  { text: "Death smiles at us all; all a man can do is smile back.", author: "Marcus Aurelius (Gladiator)" },
  { text: "The days are long, but the years are short.", author: "Gretchen Rubin" },
  { text: "Memento mori — remember that you must die.", author: "Stoic maxim" },
  { text: "What we do now echoes in eternity.", author: "Marcus Aurelius" },
  { text: "A year from now you may wish you had started today.", author: "Karen Lamb" },
  {
    text: "Ordinary people think merely of spending time. Great people think of using it.",
    author: "attributed to Schopenhauer",
  },
  { text: "You may delay, but time will not.", author: "Benjamin Franklin" },
];

export function randomQuote(): Quote {
  return QUOTES[Math.floor(Math.random() * QUOTES.length)];
}
