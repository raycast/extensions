export function main(state) {
  try {
    state.text = state.text.normalize("NFKC");
  } catch (error) {
    state.postError(error.message || "An error occurred while normalizing the text.");
  }
}
