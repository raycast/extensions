export default function getGroupIcon(group: string) {
  const iso = new Date().toISOString().split("T")[0];
  return `https://storage.googleapis.com/indie-hackers.appspot.com/group-icons/${group}/72x72_${group}.webp?ts=${iso}`;
}
