export function main(state) {
  try {
    state.text = state.text.normalize("NFC");
  } catch (error) {
    state.postError(error.message || "An error occurred while normalizing the text.");
  }
}
