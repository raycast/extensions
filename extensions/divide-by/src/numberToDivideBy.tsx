import { showHUD, Cache } from "@raycast/api";

interface Props {
  arguments: {
    numberToDivideBy: string | number;
  };
}

const cache = new Cache();

export default async function InputNumber(props: Props) {
  const input = props.arguments.numberToDivideBy;

  if (!Number(input)) {
    await showHUD(`❌ Please input a number`);
  } else {
    cache.set("divideBy", JSON.stringify(input));
    await showHUD(`${input} set as a default division number`);
  }
}
