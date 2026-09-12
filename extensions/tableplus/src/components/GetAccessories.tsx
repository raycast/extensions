import { preferences } from "../constants";
import { Connection, tintColors } from "../interfaces";
import { uppercaseText } from "../utils";

export function GetAccessories(connection: Connection) {
  const accessories = [];

  if (preferences.showConnectionDriver) {
    accessories.push({ tag: connection.Driver.toString() });
  }

  if (connection.Environment) {
    accessories.push({
      tag: {
        color: tintColors[connection.Environment],
        value: uppercaseText(connection.Environment),
      },
    });
  }

  return accessories;
}
