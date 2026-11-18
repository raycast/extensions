// Raycast can echo a controlled searchText update after selection events.
// Ignore that echo; enter the first valid format without requiring a selection event.
export class InputActivation {
  private text = "";
  private entered = false;
  accept(text: string, valid: boolean) {
    if (text === this.text)
      return { duplicate: true, initial: false, preview: false };
    this.text = text;
    if (!text.trim()) this.entered = false;
    const initial = valid && !this.entered;
    if (valid) this.entered = true;
    return { duplicate: false, initial, preview: valid };
  }
}
