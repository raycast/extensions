import { Input } from "./Input.styles-api";
import { InputWrapper } from "./InputWrapper.styles-api";

export const TimeInput = {
  controls: "Wrapper around hours, minutes and seconds inputs",
  timeInput: "Hours, minutes and seconds inputs",
  // disabled: 'Disabled modifier',
  ...Input,
  ...InputWrapper,
};

export const TimeRangeInput = TimeInput;
