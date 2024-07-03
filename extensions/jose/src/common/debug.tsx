// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function DebugInPart(data: any, chunkSize = 1000) {
  const dataString = JSON.stringify(data);

  for (let i = 0; i < dataString.length; i += chunkSize) {
    console.log(dataString.slice(i, i + chunkSize));
  }
}
