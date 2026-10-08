import { Icon, List } from "@raycast/api";
import { colorMap } from "../genres";

export default function GenreDropdown(props: { onGenreSelection: React.Dispatch<React.SetStateAction<string>> }) {
  const { onGenreSelection } = props;
  return (
    <List.Dropdown tooltip="Select Genre" onChange={(genreSelection) => onGenreSelection(genreSelection)}>
      <List.Dropdown.Item key="All Genres" title="All Genres" value="All Genres" />
      {Object.entries(colorMap).map(([genre, genreColor]) => (
        <List.Dropdown.Item
          key={genre}
          title={genre}
          value={genre}
          icon={{ source: Icon.Circle, tintColor: genreColor }}
        />
      ))}
    </List.Dropdown>
  );
}
