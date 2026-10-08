import SearchList from "./components/SearchList";

/**
 * Normalizes category labels by removing a trailing "Internship Roles" suffix.
 *
 * @param title - Raw category title from API.
 * @returns Cleaned category title.
 */
const stripInternshipSuffix = (title: string) => title.replace(/\s*Internship Roles$/, "").trim();

/**
 * Entry point for browsing Internship roles; renders SearchList and normalizes category titles.
 */
export default function Command() {
  return <SearchList resource={"Internship"} normalizeCategoryTitle={stripInternshipSuffix} />;
}
