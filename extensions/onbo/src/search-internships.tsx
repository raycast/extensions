import SearchList from "./components/SearchList";

const stripInternshipSuffix = (title: string) => title.replace(/\s*Internship Roles$/, "").trim();

export default function Command() {
  return <SearchList resource={"Internship"} normalizeCategoryTitle={stripInternshipSuffix} />;
}
