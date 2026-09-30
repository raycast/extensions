export const CATEGORIES = [
  { value: "Academic", emoji: "🎓", weight: 80 },
  { value: "AI", emoji: "✨", weight: 100 },
  { value: "Arts", emoji: "🎨" },
  { value: "Automotive", emoji: "🚗" },
  { value: "BlockChain", emoji: "🔗" },
  { value: "Blog", emoji: "📝" },
  { value: "Business", emoji: "💼", weight: 70 },
  { value: "Culture", emoji: "🌍" },
  { value: "DIY & Crafts", emoji: "🔨" },
  { value: "Economics", emoji: "💹", weight: 80 },
  { value: "Education", emoji: "📚" },
  { value: "Energy", emoji: "🔋" },
  { value: "Entertainment", emoji: "🎭" },
  { value: "Environment", emoji: "🌱" },
  { value: "Finance", emoji: "💰", weight: 80 },
  { value: "Finance & Economics", emoji: "💰", weight: 80 },
  { value: "Gaming", emoji: "🎮" },
  { value: "General", emoji: "🌞", weight: 90 },
  { value: "Health", emoji: "💊" },
  { value: "History", emoji: "📜" },
  { value: "Language", emoji: "🔤" },
  { value: "Legal", emoji: "🧑‍⚖️" },
  { value: "Lifestyle", emoji: "🛋️" },
  { value: "Others", emoji: "💭" },
  { value: "Personal Development", emoji: "🚀", weight: 85 },
  { value: "Philosophy", emoji: "🤔" },
  { value: "Politics", emoji: "🏛", weight: 80 },
  { value: "Product", emoji: "📱", weight: 85 },
  { value: "Programming", emoji: "💻", weight: 85 },
  { value: "Psychology", emoji: "🧠", weight: 80 },
  { value: "Real Estate", emoji: "🏠" },
  { value: "Religion", emoji: "⛪" },
  { value: "Science", emoji: "🔬", weight: 80 },
  { value: "Social Media", emoji: "💬" },
  { value: "Sports", emoji: "⚽" },
  { value: "Startup", emoji: "🚀", weight: 90 },
  { value: "Technology", emoji: "🤖", weight: 90 },
  { value: "Travel", emoji: "🛫" },
  { value: "Web3", emoji: "🌐" },
];

export const CATEGORIES_EMOJI_MAP = CATEGORIES.reduce(
  (acc, cur) => {
    acc[cur.value] = cur.emoji ?? "💡";
    return acc;
  },
  {} as Record<string, string>,
);

export const CATEGORIES_WEIGHT_MAP = CATEGORIES.reduce(
  (acc, cur) => {
    acc[cur.value] = cur.weight ?? 1;
    return acc;
  },
  {} as Record<string, number>,
);
