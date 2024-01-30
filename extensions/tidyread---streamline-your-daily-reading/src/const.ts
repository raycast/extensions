export const CATEGORIES = [
  { value: "AI", emoji: "✨" },
  { value: "Arts", emoji: "🎨" },
  { value: "Automotive", emoji: "🚗" },
  { value: "Blog", emoji: "📝" },
  { value: "Business", emoji: "💼" },
  { value: "Culture", emoji: "🌍" },
  { value: "DIY & Crafts", emoji: "🔨" },
  { value: "Economics", emoji: "💹" },
  { value: "Education", emoji: "📚" },
  { value: "Entertainment", emoji: "🎭" },
  { value: "Environment", emoji: "🌱" },
  { value: "Finance", emoji: "💰" },
  { value: "Gaming", emoji: "🎮" },
  { value: "General", emoji: "🌞" },
  { value: "Health", emoji: "💊" },
  { value: "History", emoji: "📜" },
  { value: "Language", emoji: "🔤" },
  { value: "Legal", emoji: "🧑‍⚖️" },
  { value: "Lifestyle", emoji: "🛋️" },
  { value: "Other", emoji: "💭" },
  { value: "Personal Development", emoji: "🚀" },
  { value: "Philosophy", emoji: "🤔" },
  { value: "Politics", emoji: "🏛" },
  { value: "Product", emoji: "📱" },
  { value: "Programming", emoji: "💻" },
  { value: "Psychology", emoji: "🧠" },
  { value: "Real Estate", emoji: "🏠" },
  { value: "Religion", emoji: "⛪" },
  { value: "Science", emoji: "🔬" },
  { value: "Social Media", emoji: "💬" },
  { value: "Sports", emoji: "⚽" },
  { value: "Startup", emoji: "🚀" },
  { value: "Technology", emoji: "🤖" },
  { value: "Travel", emoji: "🛫" },
];

export const CATEGORIES_MAP = CATEGORIES.reduce(
  (acc, cur) => {
    acc[cur.value] = cur.emoji;
    return acc;
  },
  {} as Record<string, string>,
);
