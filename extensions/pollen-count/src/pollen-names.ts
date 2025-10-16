export function getEnglishName(name: string): string {
  const pollenNames: Record<string, string> = {
    Graeser: "Grass",
    Ambrosia: "Ragweed",
    Beifuss: "Mugwort",
    Erle: "Alder",
    Birke: "Birch",
    Esche: "Ash",
    Roggen: "Rye",
    Hasel: "Hazel",
    Eiche: "Oak",
  };

  return pollenNames[name] || name;
}
