import { BarcodeTypeListCommand, TWO_D_BARCODE_TYPES } from "./barcode-components";

export default function Command() {
  return (
    <BarcodeTypeListCommand
      kind="2D"
      searchBarPlaceholder="Choose a 2D barcode type"
      barcodeTypes={TWO_D_BARCODE_TYPES}
    />
  );
}
