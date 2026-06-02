import type { Post } from "./types";

export const CATEGORY_SECTIONS = [
  {
    title: "Wszystkie",
    items: [{ id: "0", name: "Wszystkie" }],
  },
  {
    title: "Tech",
    items: [
      { id: "10517", name: "Tech (wszystkie)" },
      { id: "12429", name: "Mobile" },
      { id: "28870", name: "Sprzęt" },
      { id: "15577", name: "Foto Video" },
      { id: "30532", name: "AI" },
      { id: "25860", name: "Audio" },
      { id: "25642", name: "Smart Home" },
      { id: "867", name: "Web" },
    ],
  },
  {
    title: "Rozrywka",
    items: [
      { id: "10516", name: "Rozrywka (wszystkie)" },
      { id: "12184", name: "Gry" },
      { id: "28868", name: "Gaming" },
      { id: "15384", name: "Filmy i seriale" },
      { id: "4718", name: "Lifestyle" },
    ],
  },
  {
    title: "Inne",
    items: [
      { id: "9169", name: "Aktualności" },
      { id: "7559", name: "Marketing i nowe media" },
    ],
  },
];

export const PARENT_CATEGORY_IDS = new Set([10517, 10516]);

export function groupByDate(posts: Post[]): { title: string; posts: Post[] }[] {
  const now = new Date();
  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  );
  const startOfYesterday = new Date(startOfToday);
  startOfYesterday.setDate(startOfYesterday.getDate() - 1);

  const today: Post[] = [];
  const yesterday: Post[] = [];
  const older: Post[] = [];

  for (const post of posts) {
    const d = new Date(post.date);
    const startOfDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    if (startOfDay >= startOfToday) today.push(post);
    else if (startOfDay >= startOfYesterday) yesterday.push(post);
    else older.push(post);
  }

  return [
    { title: "Dziś", posts: today },
    { title: "Wczoraj", posts: yesterday },
    { title: "Wcześniej", posts: older },
  ].filter((g) => g.posts.length > 0);
}
