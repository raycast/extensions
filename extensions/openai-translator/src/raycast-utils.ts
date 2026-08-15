import packageJson from "../package.json";

export function dropdownDataByName(name: string): { title: string; value: string }[] | undefined {
  const data = packageJson.preferences
    ?.filter(
      (pref) =>
        "type" in pref && // Check if 'type' property exists
        pref.type === "dropdown",
    )
    ?.find(
      (pref) =>
        "name" in pref && // Check if 'name' property exists
        pref.name === name,
    )?.data;

  return data;
}
