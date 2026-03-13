import { Clipboard, List, showToast, Toast, ActionPanel, Action } from "@raycast/api";
import { useState } from "react";
type CategoryType = { id: string; name: string };

function CategoryDropdown(props: { categories: CategoryType[]; onCategoryChange: (newValue: string) => void }) {
  const { categories, onCategoryChange } = props;
  return (
    <List.Dropdown tooltip="Select Category" storeValue={true} onChange={onCategoryChange}>
      {categories.map((category) => (
        <List.Dropdown.Item key={category.id} title={category.name} value={category.id} />
      ))}
    </List.Dropdown>
  );
}
function SelectMoods() {
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const categories: CategoryType[] = [
    { id: "all", name: "All" },
    { id: "personal-development", name: "Personal Development" },
    { id: "efficiency-and-execution", name: "Efficiency and Execution" },
    { id: "interpersonal-relationships-and-collaboration", name: "Interpersonal Relationships and Collaboration" },
  ];

  const data = [
    {
      name: "Self-Improvement",
      moods: ["😌 calm", "📅 discipline", "⌛ patience"],
      category: "personal-development",
    },
    {
      name: "Learning and Growth",
      moods: ["🤔 curiosity", "🔄 reflection", "📊 analytical"],
      category: "personal-development",
    },
    {
      name: "Positive Mindset",
      moods: ["😄 optimism", "🚀 self-motivation", "🦸 courage"],
      category: "personal-development",
    },
    {
      name: "Task-Oriented",
      moods: ["🎯 focus", "🏋️ persistence", "⏱️ efficiency"],
      category: "efficiency-and-execution",
    },
    {
      name: "Decision Making and Action",
      moods: ["💡 proactivity", "🤷‍♂️ decisiveness", "💼 determination"],
      category: "efficiency-and-execution", // Replaced 💪 with 💼 to maintain uniqueness.
    },
    {
      name: "Adaptation and Innovation",
      moods: ["🌱 adaptability", "💡 innovation", "🧠 open-mindedness"], // Replaced 🔄 with 🌱 to maintain uniqueness.
      category: "efficiency-and-execution",
    },
    {
      name: "Team Collaboration",
      moods: ["🤝 collaborative", "🗂️ organization", "🔗 responsibility"], // Replaced one 🤝 with 🔗 to maintain uniqueness.
      category: "interpersonal-relationships-and-collaboration",
    },
    {
      name: "Psychological Resilience",
      moods: ["🛡️ resilience", "✊ empowerment", "⚖️ balanced"], // Replaced 💪 with 🛡️ and ✊ to maintain uniqueness.
      category: "interpersonal-relationships-and-collaboration",
    },
    {
      name: "Creativity and Inspiration",
      moods: ["🎨 inspired"], // Changed 💡 to 🎨 to maintain the theme but ensure uniqueness.
      category: "interpersonal-relationships-and-collaboration",
    },
  ];

  const onCategoryChange = (newValue: string) => {
    setSelectedCategory(newValue);
  };

  const [selectedMoods, setSelectedMoods] = useState<string[]>([]);

  const handleSelectMood = (mood: string) => {
    const newSelectedMoods = selectedMoods.includes(mood)
      ? selectedMoods.filter((m) => m !== mood)
      : [...selectedMoods, mood];
    setSelectedMoods(newSelectedMoods);
  };

  const copyToClipboard = async () => {
    await Clipboard.copy(selectedMoods.join(", "));
    await showToast(Toast.Style.Success, "Copied to clipboard!");
  };

  return (
    <List searchBarAccessory={<CategoryDropdown categories={categories} onCategoryChange={onCategoryChange} />}>
      {data
        .filter((item) => selectedCategory === "all" || selectedCategory === "" || item.category === selectedCategory)
        .map((item, index) => {
          const { moods, name, category } = item;
          return (
            <List.Section key={index} title={name} subtitle={categories.find((c) => c.id === category)?.name}>
              {moods.map((mood: string) => (
                <List.Item
                  key={mood}
                  title={mood}
                  accessories={[{ text: selectedMoods.includes(mood) ? "Selected" : "" }]}
                  actions={
                    <ActionPanel>
                      <Action title="Toggle Selection" onAction={() => handleSelectMood(mood)} />
                      <Action title="Copy the Selected Moods" onAction={() => copyToClipboard()} />
                    </ActionPanel>
                  }
                />
              ))}
            </List.Section>
          );
        })}
    </List>
  );
}

module.exports = {
  default: SelectMoods,
};
