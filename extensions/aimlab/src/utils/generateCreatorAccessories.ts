import { Author } from "../types/author.types";
import { Icon, List } from "@raycast/api";

const generateCreatorAccessories = (author: Author): List.Item.Accessory[] => {
  const task = author.tasks[0];

  return [
    { text: author.d7Plays.toLocaleString(), icon: Icon.GameController, tooltip: "Total Plays" },
    { text: author.d7Users.toLocaleString(), icon: Icon.Person, tooltip: "Total Users" },
    { text: task.name, icon: task.imageUrl, tooltip: task.description },
  ];
};

export default generateCreatorAccessories;
