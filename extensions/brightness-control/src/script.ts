export enum BrightnessAction {
  Up,
  Down,
}

/**
 * Make an osaScript command to change the brightness of the screen.
 *
 * @param action The brightness action to take.
 */
export const makeScript = (action: BrightnessAction) => {
  let keyCode: number;
  switch (action) {
    case BrightnessAction.Up:
      keyCode = 144;
      break;
    case BrightnessAction.Down:
      keyCode = 145;
      break;
  }

  return `tell application "System Events" to key code ${keyCode}`;
};
