export function main(state) {
  try {
    state.text = state.text.normalize("NFKD");
  } catch (error) {
    state.postError(error.message || "An error occurred while normalizing the text.");
  }
}
