import { preferences } from "../constants";
import { Connection, tintColors } from "../interfaces";

export function GetAccessories(connection: Connection) {
  const accessories = [];

  if (preferences.showConnectionDriver) {
    accessories.push({ tag: connection.Driver.toString() });
  }

  accessories.push({
    tag: {
      color: tintColors[connection.Environment],
      value: connection.Environment.charAt(0).toUpperCase() + connection.Environment.slice(1),
    },
  });

  return accessories;
}
