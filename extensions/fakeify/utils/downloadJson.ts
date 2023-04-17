// export default function downloadTextFile(text: string, fileName: string) {
//   const blob = new Blob([text], { type: "text/plain" });
//   const url = URL.createObjectURL(blob);
//   const anchor = document.createElement("a");
//   anchor.href = url;
//   anchor.download = fileName;
//   const event = new MouseEvent("click", {
//     view: window,
//     bubbles: true,
//     cancelable: true,
//   });
//   anchor.dispatchEvent(event);
//   setTimeout(() => URL.revokeObjectURL(url), 1000);
// }
