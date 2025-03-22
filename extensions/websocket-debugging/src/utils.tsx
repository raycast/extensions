function LeftPad(number: number, targetLength: number) {
  let output = number + "";
  while (output.length < targetLength) {
    output = "0" + output;
  }
  return output;
}

export default function GetTime() {
  const date = new Date();
  return LeftPad(date.getHours(), 2) + ":" + LeftPad(date.getMinutes(), 2) + ":" + LeftPad(date.getSeconds(), 2);
}
