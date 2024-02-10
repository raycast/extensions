import { IConfigDB } from "@src/interface";
import { ENV_LIST } from "@src/constants";

export function GetAccessories(connection: IConfigDB) {
  const accessories = [];

  const foundEnv = ENV_LIST.find(item => item.value == connection.env);

  if (connection.env) {
    accessories.push({
      tag: {
        color: foundEnv?.colorLabel,
        value: connection.env?.toUpperCase(),
      },
    });
  }

  return accessories;
}
