import { Section1 } from "./components/organisms/section1";
import { usePreview } from "./hooks/preview";
import { Root } from "./components/templates/root";
import { Section2 } from "./components/organisms/section2";
import { Section3 } from "./components/organisms/section3";

type Symbols1 = "7" | "8" | "9" | "=" | "*" | "/" | "save";
type Symbols2 = "4" | "5" | "6" | "." | "-" | "+" | "unSave";
type Symbols3 = "1" | "2" | "3" | "0" | "undo" | "clean" | "finish";

export type Symbols = Symbols1 | Symbols2 | Symbols3;

export const Numpad = () => {
  const context = usePreview();

  return (
    <Root context={context}>
      <Section1 context={context} />
      <Section2 context={context} />
      <Section3 context={context} />
    </Root>
  );
};

export default Numpad;
